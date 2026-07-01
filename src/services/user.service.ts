import fs from 'node:fs'
import { ObjectId } from 'mongodb'
import { AuthProvider, StorageProvider } from '~/constants/enum'
import HTTP_STATUS from '~/constants/httpStatus'
import { USER_MESSAGES } from '~/constants/message'
import { ErrorWithStatus } from '~/models/Error'
import { Account } from '~/models/Account.schema'
import { ChangePasswordReqBody, UpdateProfileReqBody } from '~/models/request/user.request'
import { hashPassword } from '~/utils/crypto'
import databaseService from './database.service'
import helperService from './helpers/helper.service'
import { storageAdapter, UploadResult } from './storage'

class UserService {
  private toObjectId(accountId: string) {
    return helperService.toObjectId(accountId)
  }

  private async getActiveVerifiedAccount(accountId: ObjectId) {
    return helperService.ensureActiveVerifiedAccount(accountId)
  }

  private async removeUploadedFile(file?: Express.Multer.File) {
    if (!file?.path) {
      return
    }

    try {
      await fs.promises.unlink(file.path)
    } catch {
      // File cleanup should not hide the original profile update result.
    }
  }

  private getLocalAvatarUrl(file: Express.Multer.File, uploadResult: UploadResult) {
    if (file.filename) {
      return `/uploads/avatars/${file.filename}`
    }

    return `/${uploadResult.storageKey.replace(/^\/+/, '')}`
  }

  private async getAvatarUrl(file: Express.Multer.File, uploadResult: UploadResult) {
    if (uploadResult.provider === StorageProvider.cloudinary) {
      return uploadResult.thumbnailUrl || (await storageAdapter.getDownloadUrl(uploadResult.storageKey))
    }

    return this.getLocalAvatarUrl(file, uploadResult)
  }

  private async uploadAvatarFile(file: Express.Multer.File) {
    const uploadResult = await storageAdapter.upload(file, {
      folder: 'avatars',
      resourceType: 'image',
      originalName: file.originalname
    })

    return {
      uploadResult,
      avatarUrl: await this.getAvatarUrl(file, uploadResult)
    }
  }

  private async deletePreviousCloudAvatar(account: Account, newStorageKey: string) {
    if (
      account.avatarStorageProvider === StorageProvider.cloudinary &&
      account.avatarStorageKey &&
      account.avatarStorageKey !== newStorageKey
    ) {
      try {
        await storageAdapter.delete(account.avatarStorageKey)
      } catch {
        // Replacing the avatar already succeeded; stale avatar cleanup can be retried manually.
      }
    }
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
    const account = await this.getActiveVerifiedAccount(_id)
    let uploadedAvatar: UploadResult | undefined

    const updateData: Partial<{
      fullName: string
      username: string
      avatarUrl: string
      avatarStorageProvider: StorageProvider
      avatarStorageBucket: string
      avatarStorageKey: string
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

    try {
      if (avatar) {
        const avatarUpload = await this.uploadAvatarFile(avatar)
        uploadedAvatar = avatarUpload.uploadResult
        updateData.avatarUrl = avatarUpload.avatarUrl
        updateData.avatarStorageProvider = avatarUpload.uploadResult.provider
        updateData.avatarStorageBucket = avatarUpload.uploadResult.storageBucket
        updateData.avatarStorageKey = avatarUpload.uploadResult.storageKey
      }

      const updatedAccount = await databaseService.accounts.findOneAndUpdate(
        { _id },
        { $set: updateData },
        { returnDocument: 'after' }
      )

      if (!updatedAccount) {
        throw new ErrorWithStatus(USER_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
      }

      if (uploadedAvatar?.provider === StorageProvider.cloudinary) {
        await this.removeUploadedFile(avatar)
        await this.deletePreviousCloudAvatar(account, uploadedAvatar.storageKey)
      }

      return {
        _id: updatedAccount._id,
        fullName: updatedAccount.fullName,
        username: updatedAccount.username,
        avatarUrl: updatedAccount.avatarUrl,
        updatedAt: updatedAccount.updatedAt
      }
    } catch (error) {
      await Promise.allSettled([
        uploadedAvatar?.provider === StorageProvider.cloudinary
          ? storageAdapter.delete(uploadedAvatar.storageKey)
          : Promise.resolve(),
        this.removeUploadedFile(avatar)
      ])
      throw error
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
