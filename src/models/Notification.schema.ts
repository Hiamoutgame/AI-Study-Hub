import { ObjectId } from 'mongodb'
import { NotificationPriority, NotificationRefEntity, NotificationType } from '~/constants/enum'

interface NotificationInput {
  _id?: ObjectId
  recipientId: ObjectId
  senderId?: ObjectId
  sourceEventId?: string
  type: NotificationType
  title: string
  body?: string
  refEntity?: NotificationRefEntity
  refEntityId?: ObjectId
  actionUrl?: string
  isRead?: boolean
  readAt?: Date
  priority?: NotificationPriority
  createdAt?: Date
}

export class Notification implements NotificationInput {
  _id?: ObjectId
  recipientId: ObjectId
  senderId: ObjectId
  sourceEventId: string
  type: NotificationType
  title: string
  body: string
  refEntity: NotificationRefEntity
  refEntityId: ObjectId
  actionUrl: string
  isRead: boolean
  readAt: Date
  priority: NotificationPriority
  createdAt: Date

  constructor(notification: NotificationInput) {
    const now = new Date()
    this._id = notification._id
    this.recipientId = notification.recipientId
    this.senderId = notification.senderId || new ObjectId()
    this.sourceEventId = notification.sourceEventId || ''
    this.type = notification.type
    this.title = notification.title
    this.body = notification.body || ''
    this.refEntity = notification.refEntity || NotificationRefEntity.solution
    this.refEntityId = notification.refEntityId || new ObjectId()
    this.actionUrl = notification.actionUrl || ''
    this.isRead = notification.isRead || false
    this.readAt = notification.readAt || now
    this.priority = notification.priority || NotificationPriority.normal
    this.createdAt = notification.createdAt || now
  }
}
