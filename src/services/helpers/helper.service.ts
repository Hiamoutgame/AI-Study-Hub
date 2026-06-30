import { Filter, ObjectId } from 'mongodb'
import { StoragePlan } from '~/constants/enum'
import HTTP_STATUS from '~/constants/httpStatus'
import { DOCUMENT_MESSAGES, USER_MESSAGES } from '~/constants/message'
import { ActivityLog } from '~/models/ActivityLog.schema'
import { ErrorWithStatus } from '~/models/Error'
import { Solution } from '~/models/Solution.schema'
import { StorageQuota } from '~/models/StorageQuota.schema'
import databaseService from '../database.service'
import {
  CreateActivityLogInput,
  FormatStorageOptions,
  PaginationQuery,
  PaginationResult,
  ServiceHelper
} from './helper.interface'

const DEFAULT_TOTAL_BYTES = 500 * 1024 * 1024
const DEFAULT_MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024
const DEFAULT_MAX_FILES_COUNT = 100
const DEFAULT_AI_QUERIES_LIMIT = 50

class HelperService implements ServiceHelper {
  toObjectId(id: string) {
    return new ObjectId(id)
  }

  parseBoolean(value: boolean | string | undefined, defaultValue = false) {
    if (typeof value === 'boolean') {
      return value
    }

    if (value === 'true') {
      return true
    }

    if (value === 'false') {
      return false
    }

    return defaultValue
  }

  parsePagination(query: PaginationQuery): PaginationResult {
    const page = Number(query.page || 1)
    const limit = Number(query.limit || 20)
    return { page, limit, skip: (page - 1) * limit }
  }

  escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  getNotDeletedFilter<TSchema>(): Filter<TSchema> {
    return {
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }]
    } as Filter<TSchema>
  }

  async ensureActiveVerifiedAccount(accountId: ObjectId) {
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

  canViewDocument(document: Solution, accountId: ObjectId) {
    return document.isPublic || document.uploaderId.equals(accountId)
  }

  ensureCanViewDocument(
    document: Solution,
    accountId: ObjectId,
    errorMessage = DOCUMENT_MESSAGES.DOCUMENT_ACCESS_DENIED
  ) {
    if (!this.canViewDocument(document, accountId)) {
      throw new ErrorWithStatus(errorMessage, HTTP_STATUS.FORBIDDEN)
    }
  }

  async getNotDeletedDocument(solutionId: ObjectId, options?: { includeDeletedMessage?: boolean }) {
    const document = await databaseService.solutions.findOne({
      _id: solutionId,
      ...this.getNotDeletedFilter<Solution>()
    })

    if (document) {
      return document
    }

    if (options?.includeDeletedMessage) {
      const deletedDocument = await databaseService.solutions.findOne({ _id: solutionId })
      if (deletedDocument?.deletedAt) {
        throw new ErrorWithStatus(DOCUMENT_MESSAGES.DOCUMENT_ALREADY_DELETED, HTTP_STATUS.NOT_FOUND)
      }
    }

    throw new ErrorWithStatus(DOCUMENT_MESSAGES.DOCUMENT_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
  }

  getFallbackStorageQuota(accountId: ObjectId) {
    return new StorageQuota({
      accountId,
      plan: StoragePlan.free,
      totalBytes: DEFAULT_TOTAL_BYTES,
      usedBytes: 0,
      maxFileSizeBytes: DEFAULT_MAX_FILE_SIZE_BYTES,
      maxFilesCount: DEFAULT_MAX_FILES_COUNT,
      aiQueriesLimit: DEFAULT_AI_QUERIES_LIMIT,
      aiQueriesUsed: 0
    })
  }

  async getStorageQuota(accountId: ObjectId) {
    const storageQuota = await databaseService.storageQuotas.findOne({ accountId })
    return storageQuota || this.getFallbackStorageQuota(accountId)
  }

  formatStorage(storageQuota: StorageQuota, options: FormatStorageOptions = {}) {
    const storage = {
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

    if (!options.includeUsagePercent) {
      return storage
    }

    return {
      ...storage,
      usagePercent:
        storageQuota.totalBytes > 0 ? Number(((storageQuota.usedBytes / storageQuota.totalBytes) * 100).toFixed(2)) : 0
    }
  }

  async ensureStorageAvailable(accountId: ObjectId, fileSizeBytes: number) {
    const storageQuota = await this.getStorageQuota(accountId)

    if (fileSizeBytes > storageQuota.maxFileSizeBytes) {
      throw new ErrorWithStatus(DOCUMENT_MESSAGES.FILE_TOO_LARGE, HTTP_STATUS.BAD_REQUEST)
    }

    if (storageQuota.usedBytes + fileSizeBytes > storageQuota.totalBytes) {
      throw new ErrorWithStatus(DOCUMENT_MESSAGES.STORAGE_QUOTA_EXCEEDED, HTTP_STATUS.BAD_REQUEST)
    }
  }

  async increaseStorageUsage(accountId: ObjectId, fileSizeBytes: number) {
    await databaseService.storageQuotas.updateOne(
      { accountId },
      {
        $setOnInsert: {
          accountId,
          plan: StoragePlan.free,
          totalBytes: DEFAULT_TOTAL_BYTES,
          maxFileSizeBytes: DEFAULT_MAX_FILE_SIZE_BYTES,
          maxFilesCount: DEFAULT_MAX_FILES_COUNT,
          aiQueriesUsed: 0,
          aiQueriesLimit: DEFAULT_AI_QUERIES_LIMIT,
          quotaResetDate: new Date()
        },
        $inc: { usedBytes: fileSizeBytes },
        $set: { updatedAt: new Date() }
      },
      { upsert: true }
    )
  }

  async decreaseStorageUsage(accountId: ObjectId, fileSizeBytes: number) {
    const storageQuota = await databaseService.storageQuotas.findOne({ accountId })
    if (!storageQuota) {
      return
    }

    await databaseService.storageQuotas.updateOne(
      { accountId },
      {
        $set: {
          usedBytes: Math.max(storageQuota.usedBytes - fileSizeBytes, 0),
          updatedAt: new Date()
        }
      }
    )
  }

  async createActivityLog({ accountId, action, entityType, entityId, metadata, context }: CreateActivityLogInput) {
    await databaseService.activityLogs.insertOne(
      new ActivityLog({
        accountId,
        action,
        entityType,
        entityId,
        metadata,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent
      })
    )
  }
}

const helperService = new HelperService()

export default helperService
