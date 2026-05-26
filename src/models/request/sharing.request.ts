import { ParsedQs } from 'qs'
import { PermissionLevel } from '~/constants/enum'

export interface AddBookmarkReqBody {
  note?: string
}

export interface GetBookmarksQuery extends ParsedQs {
  page?: string
  limit?: string
}

export interface CreateShareLinkReqBody {
  permissionLevel: PermissionLevel
  canDownload?: boolean | string
  canComment?: boolean | string
  requiresLogin?: boolean | string
  passwordHash?: string
  maxUses?: number | string
  expiresInDays?: number | string
  note?: string
}
