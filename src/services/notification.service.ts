import { Filter, ObjectId } from 'mongodb'
import {
  ActivityAction,
  ActivityEntityType,
  NotificationPriority,
  NotificationRefEntity,
  NotificationType
} from '~/constants/enum'
import HTTP_STATUS from '~/constants/httpStatus'
import { NOTIFICATION_MESSAGES } from '~/constants/message'
import { ErrorWithStatus } from '~/models/Error'
import { Notification } from '~/models/Notification.schema'
import {
  GetAdminNotificationsQuery,
  GetMyNotificationsQuery,
  SendNotificationReqBody
} from '~/models/request/notification.request'
import databaseService from './database.service'
import helperService from './helpers/helper.service'

class NotificationService {
  private toObjectId(id: string) {
    return helperService.toObjectId(id)
  }

  private parsePagination(query: { page?: string; limit?: string }) {
    return helperService.parsePagination(query)
  }

  private parseBoolean(value: boolean | string | undefined) {
    return helperService.parseBoolean(value)
  }

  private async createActivityLog({
    adminId,
    sourceEventId,
    metadata
  }: {
    adminId: ObjectId
    sourceEventId: string
    metadata?: Record<string, unknown>
  }) {
    await helperService.createActivityLog({
      accountId: adminId,
      action: ActivityAction.adminSendNotification,
      entityType: ActivityEntityType.account,
      metadata: { sourceEventId, ...metadata }
    })
  }

  private async resolveRecipients(payload: SendNotificationReqBody) {
    if (payload.target === 'all') {
      return databaseService.accounts.find({ isActive: true }).project<{ _id: ObjectId }>({ _id: 1 }).toArray()
    }

    const recipientIds = (payload.recipientIds || []).map((id) => this.toObjectId(id))
    const recipients = await databaseService.accounts
      .find({ _id: { $in: recipientIds } })
      .project<{ _id: ObjectId }>({ _id: 1 })
      .toArray()

    if (recipients.length !== recipientIds.length) {
      throw new ErrorWithStatus(NOTIFICATION_MESSAGES.RECIPIENT_NOT_FOUND, HTTP_STATUS.UNPROCESSABLE_ENTITY)
    }

    return recipients
  }

  async sendNotification({ adminId, payload }: { adminId: string; payload: SendNotificationReqBody }) {
    const adminObjectId = this.toObjectId(adminId)
    const recipients = await this.resolveRecipients(payload)
    const sourceEventId = `evt_${new ObjectId().toString()}`
    const sentAt = new Date()
    const refEntityId = payload.refEntityId ? this.toObjectId(payload.refEntityId) : undefined

    if (recipients.length) {
      await databaseService.notifications.insertMany(
        recipients.map(
          (recipient) =>
            new Notification({
              recipientId: recipient._id,
              senderId: adminObjectId,
              sourceEventId,
              type: payload.type,
              title: payload.title.trim(),
              body: payload.body.trim(),
              refEntity: payload.refEntity || NotificationRefEntity.account,
              refEntityId,
              actionUrl: payload.actionUrl?.trim(),
              priority: payload.priority || NotificationPriority.normal,
              createdAt: sentAt
            })
        )
      )
    }

    await this.createActivityLog({
      adminId: adminObjectId,
      sourceEventId,
      metadata: {
        target: payload.target,
        recipientCount: recipients.length,
        sendEmail: this.parseBoolean(payload.sendEmail)
      }
    })

    return {
      sourceEventId,
      title: payload.title,
      type: payload.type,
      target: payload.target,
      recipientCount: recipients.length,
      sentAt
    }
  }

  async getAdminNotifications(query: GetAdminNotificationsQuery) {
    const { page, limit, skip } = this.parsePagination(query)
    const match: Filter<Notification> = {}

    if (query.type) {
      match.type = query.type as NotificationType
    }

    if (query.senderId) {
      match.senderId = this.toObjectId(query.senderId)
    }

    if (query.sourceEventId) {
      match.sourceEventId = query.sourceEventId
    }

    const groupStage = {
      _id: '$sourceEventId',
      sourceEventId: { $first: '$sourceEventId' },
      title: { $first: '$title' },
      body: { $first: '$body' },
      type: { $first: '$type' },
      priority: { $first: '$priority' },
      recipientCount: { $sum: 1 },
      readCount: { $sum: { $cond: ['$isRead', 1, 0] } },
      sentAt: { $min: '$createdAt' },
      senderId: { $first: '$senderId' }
    }

    const [items, totals] = await Promise.all([
      databaseService.notifications
        .aggregate([
          { $match: match },
          { $group: groupStage },
          { $sort: { sentAt: -1 } },
          { $skip: skip },
          { $limit: limit }
        ])
        .toArray(),
      databaseService.notifications
        .aggregate([{ $match: match }, { $group: groupStage }, { $count: 'total' }])
        .toArray()
    ])

    const total = Number(totals[0]?.total || 0)
    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  async getMyNotifications({ accountId, query }: { accountId: string; query: GetMyNotificationsQuery }) {
    const userObjectId = this.toObjectId(accountId)
    const { page, limit, skip } = this.parsePagination(query)
    const filter: Filter<Notification> = {
      recipientId: userObjectId
    }

    if (query.isRead !== undefined) {
      filter.isRead = this.parseBoolean(query.isRead)
    }

    if (query.type) {
      filter.type = query.type as NotificationType
    }

    const [data, total, unreadCount] = await Promise.all([
      databaseService.notifications.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      databaseService.notifications.countDocuments(filter),
      databaseService.notifications.countDocuments({ recipientId: userObjectId, isRead: false })
    ])

    return {
      data,
      meta: {
        unreadCount,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  async markRead({ accountId, notificationId }: { accountId: string; notificationId: string }) {
    const userObjectId = this.toObjectId(accountId)
    const notificationObjectId = this.toObjectId(notificationId)
    const readAt = new Date()
    const updated = await databaseService.notifications.findOneAndUpdate(
      { _id: notificationObjectId, recipientId: userObjectId },
      { $set: { isRead: true, readAt } },
      { returnDocument: 'after' }
    )

    if (!updated) {
      throw new ErrorWithStatus(NOTIFICATION_MESSAGES.NOTIFICATION_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    return {
      _id: updated._id,
      isRead: updated.isRead,
      readAt: updated.readAt
    }
  }
}

const notificationService = new NotificationService()

export default notificationService
