import { ObjectId } from 'mongodb'
import { PermissionLevel } from '~/constants/enum'

interface PermissionLinkInput {
  _id?: ObjectId
  solutionId: ObjectId
  createdBy: ObjectId
  token: string
  permissionLevel: PermissionLevel
  canView?: boolean
  canDownload?: boolean
  canComment?: boolean
  requiresLogin?: boolean
  passwordHash?: string
  maxUses?: number | null
  currentUses?: number
  expiresAt?: Date | null
  isActive?: boolean
  note?: string
  lastUsedAt?: Date
  createdAt?: Date
}

export class PermissionLink implements PermissionLinkInput {
  _id?: ObjectId
  solutionId: ObjectId
  createdBy: ObjectId
  token: string
  permissionLevel: PermissionLevel
  canView: boolean
  canDownload: boolean
  canComment: boolean
  requiresLogin: boolean
  passwordHash: string
  maxUses: number | null
  currentUses: number
  expiresAt: Date | null
  isActive: boolean
  note: string
  lastUsedAt: Date
  createdAt: Date

  constructor(permissionLink: PermissionLinkInput) {
    const now = new Date()
    this._id = permissionLink._id
    this.solutionId = permissionLink.solutionId
    this.createdBy = permissionLink.createdBy
    this.token = permissionLink.token
    this.permissionLevel = permissionLink.permissionLevel
    this.canView = permissionLink.canView || true
    this.canDownload = permissionLink.canDownload || false
    this.canComment = permissionLink.canComment || false
    this.requiresLogin = permissionLink.requiresLogin || false
    this.passwordHash = permissionLink.passwordHash || ''
    this.maxUses = permissionLink.maxUses ?? null
    this.currentUses = permissionLink.currentUses || 0
    this.expiresAt = permissionLink.expiresAt ?? null
    this.isActive = permissionLink.isActive || true
    this.note = permissionLink.note || ''
    this.lastUsedAt = permissionLink.lastUsedAt || now
    this.createdAt = permissionLink.createdAt || now
  }
}
