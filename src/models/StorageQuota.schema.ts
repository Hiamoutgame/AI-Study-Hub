import { ObjectId } from 'mongodb'
import { StoragePlan } from '~/constants/enum'

interface StorageQuotaType {
  _id?: ObjectId
  accountId: ObjectId
  plan?: StoragePlan
  totalBytes: number
  usedBytes?: number
  maxFileSizeBytes: number
  maxFilesCount?: number
  aiQueriesUsed?: number
  aiQueriesLimit?: number
  quotaResetDate?: Date
  updatedAt?: Date
}

export class StorageQuota implements StorageQuotaType {
  _id?: ObjectId
  accountId: ObjectId
  plan: StoragePlan
  totalBytes: number
  usedBytes: number
  maxFileSizeBytes: number
  maxFilesCount: number
  aiQueriesUsed: number
  aiQueriesLimit: number
  quotaResetDate: Date
  updatedAt: Date

  constructor(storageQuota: StorageQuotaType) {
    const now = new Date()
    this._id = storageQuota._id
    this.accountId = storageQuota.accountId
    this.plan = storageQuota.plan || StoragePlan.free
    this.totalBytes = storageQuota.totalBytes
    this.usedBytes = storageQuota.usedBytes || 0
    this.maxFileSizeBytes = storageQuota.maxFileSizeBytes
    this.maxFilesCount = storageQuota.maxFilesCount || 0
    this.aiQueriesUsed = storageQuota.aiQueriesUsed || 0
    this.aiQueriesLimit = storageQuota.aiQueriesLimit || 50
    this.quotaResetDate = storageQuota.quotaResetDate || now
    this.updatedAt = storageQuota.updatedAt || now
  }
}
