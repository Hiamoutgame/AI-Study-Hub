import { ParsedQs } from 'qs'
import { StoragePlan, UserRole } from '~/constants/enum'

export interface PaginationQuery extends ParsedQs {
  page?: string
  limit?: string
}

export interface AdminUsersQuery extends PaginationQuery {
  q?: string
  role?: UserRole
  status?: 'active' | 'locked' | 'unverified'
  plan?: StoragePlan
  sortBy?: 'createdAt' | 'fullName' | 'lastLoginAt'
  order?: 'asc' | 'desc'
}

export interface UpdateUserStatusReqBody {
  isActive: boolean
  reason?: string
}

export interface UpdateUserRoleReqBody {
  role: UserRole
}

export interface UpdateUserStorageQuotaReqBody {
  plan?: StoragePlan
  totalBytes?: number
  maxFileSizeBytes?: number
  aiQueriesLimit?: number
}

export interface DeleteUserReqBody {
  reason?: string
}

export interface AdminDocumentsQuery extends PaginationQuery {
  q?: string
  uploaderId?: string
  categoryId?: string
  isPublic?: string
  ocrStatus?: string
  aiStatus?: string
  status?: string
  flagged?: string
}

export interface AdminDeleteDocumentReqBody {
  reason: string
  notifyUser?: boolean
}

export interface FlagDocumentReqBody {
  reason: string
  category?: 'copyright' | 'inappropriate' | 'spam' | 'other'
}

export interface DashboardQuery extends ParsedQs {
  period?: 'today' | 'week' | 'month' | 'year'
}

export interface StatsQuery extends ParsedQs {
  from?: string
  to?: string
  groupBy?: 'day' | 'week' | 'month'
}
