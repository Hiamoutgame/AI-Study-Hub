import { ObjectId } from 'mongodb'
import { TokenType } from '~/constants/enum'
import HTTP_STATUS from '~/constants/httpStatus'
import { ACCOUNT_MESSAGES } from '~/constants/message'
import { Account, AccountType } from '~/models/Account.schema'
import { ErrorWithStatus } from '~/models/Error'
import { LoginReqBody, RegisterReqBody, ResetPasswordReqBody } from '~/models/request/account.request'
import { BASE_URL } from '~/constants/base'
import { hashPassword } from '~/utils/crypto'
import { signToken } from '~/utils/jwt'
import databaseService from './database.service'

const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 60 * 60
const RESET_PASSWORD_TOKEN_EXPIRES_IN_MINUTES = 15

class AccountService {
  private normalizeEmail(email: string) {
    return email.toLowerCase().trim()
  }

  private async findAccountByEmail(email: string) {
    return databaseService.accounts.findOne({ email: this.normalizeEmail(email) })
  }

  private async signAccountToken({ accountId, tokenType }: { accountId: ObjectId | string; tokenType: TokenType }) {
    return signToken({
      payload: {
        user_id: accountId.toString(),
        token_type: tokenType
      },
      privateKey: process.env.JWT_PRIVATE_KEY as string
    })
  }

  private getPublicAccount(account: AccountType) {
    return {
      _id: account._id,
      email: account.email,
      fullName: account.fullName,
      username: account.username,
      role: account.role,
      avatarUrl: account.avatarUrl,
      isEmailVerified: account.isEmailVerified,
      isActive: account.isActive
    }
  }

  async register(payload: RegisterReqBody) {
    const accountId = new ObjectId()
    const emailVerifyToken = await this.signAccountToken({
      accountId,
      tokenType: TokenType.EmailVerificationToken
    })

    const result = await databaseService.accounts.insertOne(
      new Account({
        _id: accountId,
        email: payload.email,
        passwordHash: hashPassword(payload.password),
        fullName: payload.fullName,
        username: payload.username,
        isEmailVerified: false,
        emailVerifyToken
      })
    )

    console.log(`${BASE_URL}/account/verify-email?email_verify_token=${emailVerifyToken}`)
    return result
  }

  async checkEmailExist(email: string): Promise<boolean> {
    const account = await this.findAccountByEmail(email)
    return Boolean(account)
  }

  async checkEmailVerifyToken({ user_id, email_verify_token }: { user_id: string; email_verify_token: string }) {
    const account = await databaseService.accounts.findOne({
      _id: new ObjectId(user_id),
      emailVerifyToken: email_verify_token
    })

    if (!account) {
      throw new ErrorWithStatus(ACCOUNT_MESSAGES.EMAIL_VERIFY_TOKEN_IS_INVALID, HTTP_STATUS.UNPROCESSABLE_ENTITY)
    }
  }

  async verifyEmail({ user_id }: { user_id: string }) {
    await databaseService.accounts.updateOne(
      { _id: new ObjectId(user_id) },
      { $set: { isEmailVerified: true, updatedAt: new Date(), emailVerifyToken: '' } }
    )
    return true
  }

  async resendVerification(email: string) {
    const account = await this.findAccountByEmail(email)

    if (!account) {
      throw new ErrorWithStatus(ACCOUNT_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.UNPROCESSABLE_ENTITY)
    }

    if (!account.isActive) {
      throw new ErrorWithStatus(ACCOUNT_MESSAGES.USER_BANNED_CANNOT_RESEND_VERIFY_EMAIL, HTTP_STATUS.UNAUTHORIZED)
    }

    if (account.isEmailVerified) {
      throw new ErrorWithStatus(ACCOUNT_MESSAGES.EMAIL_ALREADY_VERIFIED_BEFORE, HTTP_STATUS.UNPROCESSABLE_ENTITY)
    }

    const emailVerifyToken = await this.signAccountToken({
      accountId: account._id as ObjectId,
      tokenType: TokenType.EmailVerificationToken
    })

    await databaseService.accounts.updateOne(
      { _id: account._id },
      { $set: { emailVerifyToken, updatedAt: new Date() } }
    )

    console.log(`${BASE_URL}/account/verify-email?email_verify_token=${emailVerifyToken}`)
    return true
  }

  async login(payload: LoginReqBody) {
    const account = await this.findAccountByEmail(payload.email)

    if (!account || account.passwordHash !== hashPassword(payload.password)) {
      throw new ErrorWithStatus(ACCOUNT_MESSAGES.EMAIL_OR_PASSWORD_IS_INCORRECT, HTTP_STATUS.UNPROCESSABLE_ENTITY)
    }

    if (!account.isActive) {
      throw new ErrorWithStatus(ACCOUNT_MESSAGES.EMAIL_HAS_BEEN_BANNED, HTTP_STATUS.UNAUTHORIZED)
    }

    if (!account.isEmailVerified) {
      throw new ErrorWithStatus(ACCOUNT_MESSAGES.USER_NOT_VERIFIED, HTTP_STATUS.UNAUTHORIZED)
    }

    const accessToken = await signToken({
      payload: {
        user_id: account._id?.toString(),
        role: account.role,
        email: account.email,
        token_type: TokenType.AccessToken
      },
      privateKey: process.env.JWT_PRIVATE_KEY as string,
      options: {
        algorithm: 'HS256',
        expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS
      }
    })

    await databaseService.accounts.updateOne({ _id: account._id }, { $set: { lastLoginAt: new Date() } })

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
      user: this.getPublicAccount(account)
    }
  }

  async forgotPassword(email: string) {
    const account = await this.findAccountByEmail(email)

    if (!account) {
      return false
    }

    const resetPasswordToken = await this.signAccountToken({
      accountId: account._id as ObjectId,
      tokenType: TokenType.ForgotPasswordToken
    })
    const resetPasswordExpires = new Date(Date.now() + RESET_PASSWORD_TOKEN_EXPIRES_IN_MINUTES * 60 * 1000)

    await databaseService.accounts.updateOne(
      { _id: account._id },
      { $set: { resetPasswordToken, resetPasswordExpires, updatedAt: new Date() } }
    )

    console.log(`${BASE_URL}/account/reset-password?token=${resetPasswordToken}`)
    return true
  }

  async resetPassword({ user_id, token, newPassword }: ResetPasswordReqBody & { user_id: string }) {
    const account = await databaseService.accounts.findOne({
      _id: new ObjectId(user_id),
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    })

    if (!account) {
      throw new ErrorWithStatus(ACCOUNT_MESSAGES.FORGOT_PASSWORD_TOKEN_IS_INVALID, HTTP_STATUS.UNPROCESSABLE_ENTITY)
    }

    await databaseService.accounts.updateOne(
      { _id: account._id },
      {
        $set: {
          passwordHash: hashPassword(newPassword),
          resetPasswordToken: '',
          resetPasswordExpires: new Date(),
          updatedAt: new Date()
        }
      }
    )

    return true
  }
}

const accountService = new AccountService()

export default accountService
