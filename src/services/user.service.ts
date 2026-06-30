import { ObjectId } from 'mongodb'
import { AuthProvider } from '~/constants/enum'
import HTTP_STATUS from '~/constants/httpStatus'
import { USER_MESSAGES } from '~/constants/message'
import { ErrorWithStatus } from '~/models/Error'
import { ChangePasswordReqBody, UpdateProfileReqBody } from '~/models/request/user.request'
import { hashPassword } from '~/utils/crypto'
import databaseService from './database.service'
import helperService from './helpers/helper.service'

class UserService {
  private toObjectId(accountId: string) {
    return helperService.toObjectId(accountId)
  }

  private async getActiveVerifiedAccount(accountId: ObjectId) {
    return helperService.ensureActiveVerifiedAccount(accountId)
  }

  private buildAvatarUrl(file?: Express.Multer.File) {
    if (!file) {
      return undefined
    }

    return `/uploads/avatars/${file.filename}`
  }

  private async getStorageQuota(accountId: ObjectId) {
    return helperService.getStorageQuota(accountId)
  }

  private formatStorage(storageQuota: Awaited<ReturnType<typeof helperService.getStorageQuota>>) {
    return helperService.formatStorage(storageQuota, { includeUsagePercent: true })
  }

  async getProfile(accountId: string) {
    const _id = this.toObjectId(accountId)
    const account = await this.getActiveVerifiedAccount(_id)
    const storageQuota = await this.getStorageQuota(_id)

    return {
      _id: account._id,
      email: account.email,
      fullName: account.fullName,
      username: account.username,
      avatarUrl: account.avatarUrl,
      role: account.role,
      isEmailVerified: account.isEmailVerified,
      isActive: account.isActive,
      createdAt: account.createdAt,
      lastLoginAt: account.lastLoginAt,
      storage: this.formatStorage(storageQuota)
    }
  }

  async getStorage(accountId: string) {
    const _id = this.toObjectId(accountId)
    await this.getActiveVerifiedAccount(_id)
    const storageQuota = await this.getStorageQuota(_id)

    return this.formatStorage(storageQuota)
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
