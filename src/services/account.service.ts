import { ObjectId } from 'mongodb'
import { TokenType } from '~/constants/enum'
import HTTP_STATUS from '~/constants/httpStatus'
import { ACCOUNT_MESSAGES } from '~/constants/message'
import { Account, AccountType } from '~/models/Account.schema'
import { ErrorWithStatus } from '~/models/Error'
import { LoginReqBody, RegisterReqBody, ResetPasswordReqBody } from '~/models/request/account.request'
import { hashPassword } from '~/utils/crypto'
import { signToken } from '~/utils/jwt'
import { generateOtp } from '~/utils/otp'
import emailService from './email.service'
import databaseService from './database.service'

const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 60 * 60
const RESET_PASSWORD_OTP_EXPIRES_IN_MINUTES = 15
const EMAIL_VERIFY_OTP_EXPIRES_IN_MINUTES = 10

class AccountService {
  private normalizeEmail(email: string) {
    return email.toLowerCase().trim()
  }

  private async findAccountByEmail(email: string) {
    return databaseService.accounts.findOne({ email: this.normalizeEmail(email) })
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
    const otp = generateOtp()
    const emailVerifyTokenExpires = new Date(Date.now() + EMAIL_VERIFY_OTP_EXPIRES_IN_MINUTES * 60 * 1000)

    const result = await databaseService.accounts.insertOne(
      new Account({
        _id: accountId,
        email: payload.email,
        passwordHash: hashPassword(payload.password),
        fullName: payload.fullName,
        username: payload.username,
        isEmailVerified: false,
        emailVerifyToken: otp,
        emailVerifyTokenExpires
      })
    )

    await emailService.sendVerifyEmailOtp(payload.email, otp, EMAIL_VERIFY_OTP_EXPIRES_IN_MINUTES)
    return result
  }

  async checkEmailExist(email: string): Promise<boolean> {
    const account = await this.findAccountByEmail(email)
    return Boolean(account)
  }

  async verifyEmailByOtp({ email, otp }: { email: string; otp: string }) {
    const account = await this.findAccountByEmail(email)

    if (
      !account ||
      account.emailVerifyToken !== otp ||
      !account.emailVerifyTokenExpires ||
      account.emailVerifyTokenExpires < new Date()
    ) {
      throw new ErrorWithStatus(ACCOUNT_MESSAGES.OTP_IS_INVALID_OR_EXPIRED, HTTP_STATUS.UNPROCESSABLE_ENTITY)
    }

    await databaseService.accounts.updateOne(
      { _id: account._id },
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

    const otp = generateOtp()
    const emailVerifyTokenExpires = new Date(Date.now() + EMAIL_VERIFY_OTP_EXPIRES_IN_MINUTES * 60 * 1000)

    await databaseService.accounts.updateOne(
      { _id: account._id },
      { $set: { emailVerifyToken: otp, emailVerifyTokenExpires, updatedAt: new Date() } }
    )

    await emailService.sendVerifyEmailOtp(account.email, otp, EMAIL_VERIFY_OTP_EXPIRES_IN_MINUTES)
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

    const otp = generateOtp()
    const resetPasswordExpires = new Date(Date.now() + RESET_PASSWORD_OTP_EXPIRES_IN_MINUTES * 60 * 1000)

    await databaseService.accounts.updateOne(
      { _id: account._id },
      { $set: { resetPasswordToken: otp, resetPasswordExpires, updatedAt: new Date() } }
    )

    await emailService.sendForgotPasswordOtp(account.email, otp, RESET_PASSWORD_OTP_EXPIRES_IN_MINUTES)
    return true
  }

  async resetPassword({ email, otp, newPassword }: Omit<ResetPasswordReqBody, 'confirmPassword'>) {
    const account = await databaseService.accounts.findOne({
      email: this.normalizeEmail(email),
      resetPasswordToken: otp,
      resetPasswordExpires: { $gt: new Date() }
    })

    if (!account) {
      throw new ErrorWithStatus(ACCOUNT_MESSAGES.OTP_IS_INVALID_OR_EXPIRED, HTTP_STATUS.UNPROCESSABLE_ENTITY)
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
