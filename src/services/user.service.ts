import { ObjectId } from 'mongodb'
import { AuthProvider } from '~/constants/enum'
import HTTP_STATUS from '~/constants/httpStatus'
import { USER_MESSAGES } from '~/constants/message'
import { ErrorWithStatus } from '~/models/Error'
import { ChangePasswordReqBody, UpdateProfileReqBody } from '~/models/request/user.request'
import { hashPassword } from '~/utils/crypto'
import databaseService from './database.service'

class UserService {
  private toObjectId(accountId: string) {
    return new ObjectId(accountId)
  }

  private async getActiveVerifiedAccount(accountId: ObjectId) {
    const account = await databaseService.accounts.findOne({ _id: accountId })

    if (!account) {
      throw new ErrorWithStatus(USER_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    if (!account.isActive) {
      throw new ErrorWithStatus(USER_MESSAGES.USER_IS_INACTIVE, HTTP_STATUS.UNAUTHORIZED)
    }

    if (!account.isEmailVerified) {
      throw new ErrorWithStatus(USER_MESSAGES.USER_NOT_VERIFIED, HTTP_STATUS.FORBIDDEN)
    }

    return account
  }

  private buildAvatarUrl(file?: Express.Multer.File) {
    if (!file) {
      return undefined
    }

    return `/uploads/avatars/${file.filename}`
  }

  async updateProfile({
    accountId,
    payload,
    avatar
  }: {
    accountId: string
    payload: UpdateProfileReqBody
    avatar?: Express.Multer.File
  }) {
    const _id = this.toObjectId(accountId)
    await this.getActiveVerifiedAccount(_id)

    const updateData: Partial<{
      fullName: string
      username: string
      avatarUrl: string
      updatedAt: Date
    }> = {
      updatedAt: new Date()
    }

    if (payload.fullName !== undefined) {
      updateData.fullName = payload.fullName.trim()
    }

    if (payload.username !== undefined) {
      const username = payload.username.trim()
      const usernameOwner = await databaseService.accounts.findOne({
        username,
        _id: { $ne: _id }
      })

      if (usernameOwner) {
        throw new ErrorWithStatus(USER_MESSAGES.USERNAME_ALREADY_EXISTS, HTTP_STATUS.UNPROCESSABLE_ENTITY)
      }

      updateData.username = username
    }

    const avatarUrl = this.buildAvatarUrl(avatar)
    if (avatarUrl) {
      updateData.avatarUrl = avatarUrl
    }

    const updatedAccount = await databaseService.accounts.findOneAndUpdate(
      { _id },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (!updatedAccount) {
      throw new ErrorWithStatus(USER_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    return {
      _id: updatedAccount._id,
      fullName: updatedAccount.fullName,
      username: updatedAccount.username,
      avatarUrl: updatedAccount.avatarUrl,
      updatedAt: updatedAccount.updatedAt
    }
  }

  async changePassword({ accountId, payload }: { accountId: string; payload: ChangePasswordReqBody }) {
    const _id = this.toObjectId(accountId)
    const account = await this.getActiveVerifiedAccount(_id)

    if (account.provider !== AuthProvider.local || account.passwordHash !== hashPassword(payload.currentPassword)) {
      throw new ErrorWithStatus(USER_MESSAGES.CURRENT_PASSWORD_IS_INCORRECT, HTTP_STATUS.UNPROCESSABLE_ENTITY)
    }

    await databaseService.accounts.updateOne(
      { _id },
      {
        $set: {
          passwordHash: hashPassword(payload.newPassword),
          resetPasswordToken: '',
          resetPasswordExpires: new Date(),
          updatedAt: new Date()
        }
      }
    )

    return true
  }
}

const userService = new UserService()

export default userService
