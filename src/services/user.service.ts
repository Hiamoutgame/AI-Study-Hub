import { ObjectId } from 'mongodb'
import { AuthProvider, StoragePlan } from '~/constants/enum'
import HTTP_STATUS from '~/constants/httpStatus'
import { USER_MESSAGES } from '~/constants/message'
import { ErrorWithStatus } from '~/models/Error'
import { ChangePasswordReqBody, UpdateProfileReqBody } from '~/models/request/user.request'
import { StorageQuota } from '~/models/StorageQuota.schema'
import { hashPassword } from '~/utils/crypto'
import databaseService from './database.service'

const DEFAULT_TOTAL_BYTES = 500 * 1024 * 1024
const DEFAULT_MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024
const DEFAULT_MAX_FILES_COUNT = 100

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

  private async getStorageQuota(accountId: ObjectId) {
    const storageQuota = await databaseService.storageQuotas.findOne({ accountId })

    return (
      storageQuota ||
      new StorageQuota({
        accountId,
        plan: StoragePlan.free,
        totalBytes: DEFAULT_TOTAL_BYTES,
        usedBytes: 0,
        maxFileSizeBytes: DEFAULT_MAX_FILE_SIZE_BYTES,
        maxFilesCount: DEFAULT_MAX_FILES_COUNT
      })
    )
  }

  private formatStorage(storageQuota: StorageQuota) {
    const usagePercent =
      storageQuota.totalBytes > 0 ? Number(((storageQuota.usedBytes / storageQuota.totalBytes) * 100).toFixed(2)) : 0

    return {
      plan: storageQuota.plan,
      usedBytes: storageQuota.usedBytes,
      totalBytes: storageQuota.totalBytes,
      maxFileSizeBytes: storageQuota.maxFileSizeBytes,
      maxFilesCount: storageQuota.maxFilesCount,
      aiQueriesUsed: storageQuota.aiQueriesUsed,
      aiQueriesLimit: storageQuota.aiQueriesLimit,
      usagePercent,
      quotaResetDate: storageQuota.quotaResetDate,
      updatedAt: storageQuota.updatedAt
    }
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
