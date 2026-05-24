import { ObjectId } from 'mongodb'
import { AuthProvider, UserRole } from '~/constants/enum'

export interface AccountType {
  _id?: ObjectId
  email: string
  passwordHash?: string
  fullName: string
  username: string
  avatarUrl?: string
  role?: UserRole
  provider?: AuthProvider
  providerId?: string
  isActive?: boolean
  isEmailVerified?: boolean
  emailVerifyToken?: string
  resetPasswordToken?: string
  resetPasswordExpires?: Date
  lastLoginAt?: Date
  deletedAt?: Date
  deletedBy?: ObjectId
  deleteReason?: string
  statusReason?: string
  statusUpdatedBy?: ObjectId
  statusUpdatedAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

export class Account implements AccountType {
  _id?: ObjectId
  email: string
  passwordHash: string
  fullName: string
  username: string
  avatarUrl: string
  role: UserRole
  provider: AuthProvider
  providerId: string
  isActive: boolean
  isEmailVerified: boolean
  emailVerifyToken: string
  resetPasswordToken: string
  resetPasswordExpires: Date
  lastLoginAt: Date
  deletedAt?: Date
  deletedBy?: ObjectId
  deleteReason: string
  statusReason: string
  statusUpdatedBy?: ObjectId
  statusUpdatedAt?: Date
  createdAt: Date
  updatedAt: Date

  constructor(account: AccountType) {
    const now = new Date()
    this._id = account._id
    this.email = account.email.toLowerCase().trim()
    this.passwordHash = account.passwordHash || ''
    this.fullName = account.fullName
    this.username = account.username
    this.avatarUrl = account.avatarUrl || ''
    this.role = account.role || UserRole.user
    this.provider = account.provider || AuthProvider.local
    this.providerId = account.providerId || ''
    this.isActive = account.isActive ?? true
    this.isEmailVerified = account.isEmailVerified ?? false
    this.emailVerifyToken = account.emailVerifyToken || ''
    this.resetPasswordToken = account.resetPasswordToken || ''
    this.resetPasswordExpires = account.resetPasswordExpires || now
    this.lastLoginAt = account.lastLoginAt || now
    this.deletedAt = account.deletedAt
    this.deletedBy = account.deletedBy
    this.deleteReason = account.deleteReason || ''
    this.statusReason = account.statusReason || ''
    this.statusUpdatedBy = account.statusUpdatedBy
    this.statusUpdatedAt = account.statusUpdatedAt
    this.createdAt = account.createdAt || now
    this.updatedAt = account.updatedAt || now
  }
}
