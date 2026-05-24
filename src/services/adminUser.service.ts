import { Filter, ObjectId } from 'mongodb'
import { ActivityAction, ActivityEntityType, StoragePlan, UserRole } from '~/constants/enum'
import HTTP_STATUS from '~/constants/httpStatus'
import { ADMIN_MESSAGES, USER_MESSAGES } from '~/constants/message'
import { Account } from '~/models/Account.schema'
import { ActivityLog } from '~/models/ActivityLog.schema'
import { ErrorWithStatus } from '~/models/Error'
import {
  AdminUsersQuery,
  DeleteUserReqBody,
  UpdateUserRoleReqBody,
  UpdateUserStatusReqBody,
  UpdateUserStorageQuotaReqBody
} from '~/models/request/admin.request'
import { StorageQuota } from '~/models/StorageQuota.schema'
import databaseService from './database.service'

const DEFAULT_TOTAL_BYTES = 500 * 1024 * 1024
const DEFAULT_MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024
const DEFAULT_MAX_FILES_COUNT = 100

class AdminUserService {
  private toObjectId(id: string) {
    return new ObjectId(id)
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  private parsePagination(query: { page?: string; limit?: string }) {
    const page = Number(query.page || 1)
    const limit = Number(query.limit || 20)
    return { page, limit, skip: (page - 1) * limit }
  }

  private getFallbackQuota(accountId: ObjectId) {
    return new StorageQuota({
      accountId,
      plan: StoragePlan.free,
      totalBytes: DEFAULT_TOTAL_BYTES,
      usedBytes: 0,
      maxFileSizeBytes: DEFAULT_MAX_FILE_SIZE_BYTES,
      maxFilesCount: DEFAULT_MAX_FILES_COUNT
    })
  }

  private formatStorage(quota?: StorageQuota, accountId?: ObjectId) {
    const storageQuota = quota || this.getFallbackQuota(accountId as ObjectId)
    return {
      plan: storageQuota.plan,
      usedBytes: storageQuota.usedBytes,
      totalBytes: storageQuota.totalBytes,
      maxFileSizeBytes: storageQuota.maxFileSizeBytes,
      maxFilesCount: storageQuota.maxFilesCount,
      aiQueriesUsed: storageQuota.aiQueriesUsed,
      aiQueriesLimit: storageQuota.aiQueriesLimit,
      quotaResetDate: storageQuota.quotaResetDate,
      updatedAt: storageQuota.updatedAt
    }
  }

  private getPublicAdminUser(account: Account) {
    return {
      _id: account._id,
      email: account.email,
      fullName: account.fullName,
      username: account.username,
      avatarUrl: account.avatarUrl,
      role: account.role,
      provider: account.provider,
      isActive: account.isActive,
      isEmailVerified: account.isEmailVerified,
      statusReason: account.statusReason,
      statusUpdatedBy: account.statusUpdatedBy,
      statusUpdatedAt: account.statusUpdatedAt,
      deletedAt: account.deletedAt,
      deletedBy: account.deletedBy,
      deleteReason: account.deleteReason,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      lastLoginAt: account.lastLoginAt
    }
  }

  private async createActivityLog({
    adminId,
    action,
    targetId,
    metadata
  }: {
    adminId: ObjectId
    action: ActivityAction
    targetId: ObjectId
    metadata?: Record<string, unknown>
  }) {
    await databaseService.activityLogs.insertOne(
      new ActivityLog({
        accountId: adminId,
        action,
        entityType: ActivityEntityType.account,
        entityId: targetId,
        metadata
      })
    )
  }

  private async getAccountOrThrow(accountId: ObjectId) {
    const account = await databaseService.accounts.findOne({ _id: accountId })
    if (!account) {
      throw new ErrorWithStatus(USER_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
    return account
  }

  private async ensureNotLastActiveAdmin(target: Account) {
    if (target.role !== UserRole.admin || !target.isActive) {
      return
    }

    const activeAdminCount = await databaseService.accounts.countDocuments({
      role: UserRole.admin,
      isActive: true,
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: undefined }]
    })

    if (activeAdminCount <= 1) {
      throw new ErrorWithStatus(ADMIN_MESSAGES.CANNOT_MODIFY_LAST_ADMIN, HTTP_STATUS.BAD_REQUEST)
    }
  }

  async getUsers(query: AdminUsersQuery) {
    const { page, limit, skip } = this.parsePagination(query)
    const filter: Filter<Account> = {}

    if (query.q) {
      const regex = this.escapeRegex(query.q)
      filter.$or = [
        { fullName: { $regex: regex, $options: 'i' } },
        { email: { $regex: regex, $options: 'i' } },
        { username: { $regex: regex, $options: 'i' } }
      ]
    }

    if (query.role) {
      filter.role = query.role
    }

    if (query.status === 'active') {
      filter.isActive = true
      filter.isEmailVerified = true
    }

    if (query.status === 'locked') {
      filter.isActive = false
    }

    if (query.status === 'unverified') {
      filter.isEmailVerified = false
    }

    if (query.plan) {
      const quotaAccountIds = await databaseService.storageQuotas
        .find({ plan: query.plan })
        .project<{ accountId: ObjectId }>({ accountId: 1 })
        .toArray()
      filter._id = { $in: quotaAccountIds.map((quota) => quota.accountId) }
    }

    const sortBy = query.sortBy || 'createdAt'
    const order = query.order === 'asc' ? 1 : -1
    const [accounts, total] = await Promise.all([
      databaseService.accounts
        .find(filter)
        .sort({ [sortBy]: order })
        .skip(skip)
        .limit(limit)
        .toArray(),
      databaseService.accounts.countDocuments(filter)
    ])

    const accountIds = accounts.map((account) => account._id as ObjectId)
    const [quotas, documentCounts] = await Promise.all([
      databaseService.storageQuotas.find({ accountId: { $in: accountIds } }).toArray(),
      databaseService.solutions
        .aggregate<{
          _id: ObjectId
          count: number
        }>([{ $match: { uploaderId: { $in: accountIds } } }, { $group: { _id: '$uploaderId', count: { $sum: 1 } } }])
        .toArray()
    ])

    const quotaMap = new Map(quotas.map((quota) => [quota.accountId.toString(), quota]))
    const documentCountMap = new Map(documentCounts.map((item) => [item._id.toString(), item.count]))

    return {
      data: accounts.map((account) => ({
        ...this.getPublicAdminUser(account),
        storage: this.formatStorage(quotaMap.get((account._id as ObjectId).toString()), account._id as ObjectId),
        documentCount: documentCountMap.get((account._id as ObjectId).toString()) || 0
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  async getUserDetail(targetId: string) {
    const accountId = this.toObjectId(targetId)
    const account = await this.getAccountOrThrow(accountId)
    const [quota, documentCount, chatSessionCount, favoriteCount] = await Promise.all([
      databaseService.storageQuotas.findOne({ accountId }),
      databaseService.solutions.countDocuments({ uploaderId: accountId }),
      databaseService.aiChatSessions.countDocuments({ accountId }),
      databaseService.favorites.countDocuments({ accountId })
    ])

    return {
      ...this.getPublicAdminUser(account),
      storage: this.formatStorage(quota || undefined, accountId),
      stats: {
        documentCount,
        chatSessionCount,
        favoriteCount
      }
    }
  }

  async updateUserStatus({
    adminId,
    targetId,
    payload
  }: {
    adminId: string
    targetId: string
    payload: UpdateUserStatusReqBody
  }) {
    const adminObjectId = this.toObjectId(adminId)
    const targetObjectId = this.toObjectId(targetId)
    const target = await this.getAccountOrThrow(targetObjectId)

    if (targetObjectId.equals(adminObjectId) && payload.isActive === false) {
      await this.ensureNotLastActiveAdmin(target)
      throw new ErrorWithStatus(ADMIN_MESSAGES.CANNOT_MODIFY_SELF, HTTP_STATUS.BAD_REQUEST)
    }

    if (payload.isActive === false) {
      await this.ensureNotLastActiveAdmin(target)
    }

    const updatedAt = new Date()
    const updated = await databaseService.accounts.findOneAndUpdate(
      { _id: targetObjectId },
      {
        $set: {
          isActive: payload.isActive,
          statusReason: payload.reason?.trim() || '',
          statusUpdatedBy: adminObjectId,
          statusUpdatedAt: updatedAt,
          updatedAt
        }
      },
      { returnDocument: 'after' }
    )

    await this.createActivityLog({
      adminId: adminObjectId,
      action: ActivityAction.adminLockUser,
      targetId: targetObjectId,
      metadata: { isActive: payload.isActive, reason: payload.reason }
    })

    return {
      _id: updated?._id,
      isActive: updated?.isActive,
      updatedBy: adminObjectId,
      updatedAt
    }
  }

  async updateUserRole({
    adminId,
    targetId,
    payload
  }: {
    adminId: string
    targetId: string
    payload: UpdateUserRoleReqBody
  }) {
    const adminObjectId = this.toObjectId(adminId)
    const targetObjectId = this.toObjectId(targetId)
    const target = await this.getAccountOrThrow(targetObjectId)

    if (target.role === UserRole.admin && payload.role !== UserRole.admin) {
      await this.ensureNotLastActiveAdmin(target)
    }

    const updatedAt = new Date()
    const updated = await databaseService.accounts.findOneAndUpdate(
      { _id: targetObjectId },
      { $set: { role: payload.role, updatedAt } },
      { returnDocument: 'after' }
    )

    await this.createActivityLog({
      adminId: adminObjectId,
      action: ActivityAction.adminUpdateUserRole,
      targetId: targetObjectId,
      metadata: { previousRole: target.role, role: payload.role }
    })

    return {
      _id: updated?._id,
      role: updated?.role,
      updatedAt
    }
  }

  async updateUserStorageQuota({
    adminId,
    targetId,
    payload
  }: {
    adminId: string
    targetId: string
    payload: UpdateUserStorageQuotaReqBody
  }) {
    const adminObjectId = this.toObjectId(adminId)
    const targetObjectId = this.toObjectId(targetId)
    await this.getAccountOrThrow(targetObjectId)

    const currentQuota = await databaseService.storageQuotas.findOne({ accountId: targetObjectId })
    const fallbackQuota = this.getFallbackQuota(targetObjectId)
    const updatedAt = new Date()
    const setData = {
      plan: payload.plan || currentQuota?.plan || fallbackQuota.plan,
      totalBytes:
        payload.totalBytes !== undefined
          ? Number(payload.totalBytes)
          : currentQuota?.totalBytes || fallbackQuota.totalBytes,
      maxFileSizeBytes:
        payload.maxFileSizeBytes !== undefined
          ? Number(payload.maxFileSizeBytes)
          : currentQuota?.maxFileSizeBytes || fallbackQuota.maxFileSizeBytes,
      aiQueriesLimit:
        payload.aiQueriesLimit !== undefined
          ? Number(payload.aiQueriesLimit)
          : currentQuota?.aiQueriesLimit || fallbackQuota.aiQueriesLimit,
      updatedAt
    }

    const quota = await databaseService.storageQuotas.findOneAndUpdate(
      { accountId: targetObjectId },
      {
        $setOnInsert: {
          accountId: targetObjectId,
          usedBytes: 0,
          maxFilesCount: DEFAULT_MAX_FILES_COUNT,
          aiQueriesUsed: 0,
          quotaResetDate: updatedAt
        },
        $set: setData
      },
      { upsert: true, returnDocument: 'after' }
    )

    await this.createActivityLog({
      adminId: adminObjectId,
      action: ActivityAction.adminUpdateUserQuota,
      targetId: targetObjectId,
      metadata: payload as Record<string, unknown>
    })

    return this.formatStorage(
      quota || ({ ...fallbackQuota, ...setData, accountId: targetObjectId } as StorageQuota),
      targetObjectId
    )
  }

  async deleteUser({ adminId, targetId, payload }: { adminId: string; targetId: string; payload?: DeleteUserReqBody }) {
    const adminObjectId = this.toObjectId(adminId)
    const targetObjectId = this.toObjectId(targetId)
    const target = await this.getAccountOrThrow(targetObjectId)

    if (targetObjectId.equals(adminObjectId)) {
      await this.ensureNotLastActiveAdmin(target)
      throw new ErrorWithStatus(ADMIN_MESSAGES.CANNOT_MODIFY_SELF, HTTP_STATUS.BAD_REQUEST)
    }

    await this.ensureNotLastActiveAdmin(target)

    const deletedAt = new Date()
    const deleteReason = payload?.reason?.trim() || 'Admin deleted user'
    await databaseService.accounts.updateOne(
      { _id: targetObjectId },
      {
        $set: {
          isActive: false,
          deletedAt,
          deletedBy: adminObjectId,
          deleteReason,
          updatedAt: deletedAt
        }
      }
    )

    await this.createActivityLog({
      adminId: adminObjectId,
      action: ActivityAction.adminDeleteUser,
      targetId: targetObjectId,
      metadata: { deleteReason }
    })

    return {
      _id: targetObjectId,
      deletedAt
    }
  }
}

const adminUserService = new AdminUserService()

export default adminUserService
