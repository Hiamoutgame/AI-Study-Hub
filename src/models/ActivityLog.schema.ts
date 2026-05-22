import { ObjectId } from 'mongodb'
import { ActivityAction, ActivityEntityType } from '~/constants/enum'

interface ActivityLogType {
  _id?: ObjectId
  accountId?: ObjectId
  action: ActivityAction
  entityType?: ActivityEntityType
  entityId?: ObjectId
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  createdAt?: Date
}

export class ActivityLog implements ActivityLogType {
  _id?: ObjectId
  accountId: ObjectId
  action: ActivityAction
  entityType: ActivityEntityType
  entityId: ObjectId
  metadata: Record<string, unknown>
  ipAddress: string
  userAgent: string
  createdAt: Date

  constructor(activityLog: ActivityLogType) {
    const now = new Date()
    this._id = activityLog._id
    this.accountId = activityLog.accountId || new ObjectId()
    this.action = activityLog.action
    this.entityType = activityLog.entityType || ActivityEntityType.session
    this.entityId = activityLog.entityId || new ObjectId()
    this.metadata = activityLog.metadata || {}
    this.ipAddress = activityLog.ipAddress || ''
    this.userAgent = activityLog.userAgent || ''
    this.createdAt = activityLog.createdAt || now
  }
}
