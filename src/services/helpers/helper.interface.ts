import { Filter, ObjectId } from 'mongodb'
import { ActivityAction, ActivityEntityType } from '~/constants/enum'
import { Account } from '~/models/Account.schema'
import { RequestContext } from '~/models/request/common.request'
import { Solution } from '~/models/Solution.schema'
import { StorageQuota } from '~/models/StorageQuota.schema'

export interface PaginationQuery {
  page?: string
  limit?: string
}

export interface PaginationResult {
  page: number
  limit: number
  skip: number
}

export interface CreateActivityLogInput {
  accountId: ObjectId
  action: ActivityAction
  entityType: ActivityEntityType
  entityId?: ObjectId
  metadata?: Record<string, unknown>
  context?: RequestContext
}

export interface FormatStorageOptions {
  includeUsagePercent?: boolean
}

export interface ServiceHelper {
  toObjectId(id: string): ObjectId
  parseBoolean(value: boolean | string | undefined, defaultValue?: boolean): boolean
  parsePagination(query: PaginationQuery): PaginationResult
  escapeRegex(value: string): string
  getNotDeletedFilter<T>(): Filter<T>
  ensureActiveVerifiedAccount(accountId: ObjectId): Promise<Account>
  canViewDocument(document: Solution, accountId: ObjectId): boolean
  ensureCanViewDocument(document: Solution, accountId: ObjectId, errorMessage?: string): void
  getNotDeletedDocument(solutionId: ObjectId, options?: { includeDeletedMessage?: boolean }): Promise<Solution>
  getFallbackStorageQuota(accountId: ObjectId): StorageQuota
  getStorageQuota(accountId: ObjectId): Promise<StorageQuota>
  formatStorage(storageQuota: StorageQuota, options?: FormatStorageOptions): Record<string, unknown>
  ensureStorageAvailable(accountId: ObjectId, fileSizeBytes: number): Promise<void>
  increaseStorageUsage(accountId: ObjectId, fileSizeBytes: number): Promise<void>
  decreaseStorageUsage(accountId: ObjectId, fileSizeBytes: number): Promise<void>
  createActivityLog(input: CreateActivityLogInput): Promise<void>
}
