import { ParsedQs } from 'qs'
import { NotificationPriority, NotificationRefEntity, NotificationType } from '~/constants/enum'

export interface SendNotificationReqBody {
  title: string
  body: string
  type: NotificationType
  priority?: NotificationPriority
  target: 'all' | 'recipientIds'
  recipientIds?: string[]
  refEntity?: NotificationRefEntity
  refEntityId?: string
  actionUrl?: string
  sendEmail?: boolean
}

export interface GetAdminNotificationsQuery extends ParsedQs {
  type?: NotificationType
  senderId?: string
  sourceEventId?: string
  page?: string
  limit?: string
}

export interface GetMyNotificationsQuery extends ParsedQs {
  isRead?: string
  type?: NotificationType
  page?: string
  limit?: string
}
