import { Filter, ObjectId } from 'mongodb'
import {
  ActivityAction,
  ActivityEntityType,
  AiStatus,
  ExtractionStatus,
  NotificationPriority,
  NotificationRefEntity,
  NotificationType,
  SolutionStatus
} from '~/constants/enum'
import HTTP_STATUS from '~/constants/httpStatus'
import { DOCUMENT_MESSAGES } from '~/constants/message'
import { ErrorWithStatus } from '~/models/Error'
import { Notification } from '~/models/Notification.schema'
import { AdminDeleteDocumentReqBody, AdminDocumentsQuery, FlagDocumentReqBody } from '~/models/request/admin.request'
import { Solution } from '~/models/Solution.schema'
import databaseService from './database.service'
import helperService from './helpers/helper.service'

class AdminDocumentService {
  private toObjectId(id: string) {
    return helperService.toObjectId(id)
  }

  private parsePagination(query: { page?: string; limit?: string }) {
    return helperService.parsePagination(query)
  }

  private parseBoolean(value: boolean | string | undefined, defaultValue = false) {
    return helperService.parseBoolean(value, defaultValue)
  }

  private escapeRegex(value: string) {
    return helperService.escapeRegex(value)
  }

  private async createActivityLog({
    adminId,
    action,
    solutionId,
    metadata
  }: {
    adminId: ObjectId
    action: ActivityAction
    solutionId: ObjectId
    metadata?: Record<string, unknown>
  }) {
    await helperService.createActivityLog({
      accountId: adminId,
      action,
      entityType: ActivityEntityType.solution,
      entityId: solutionId,
      metadata
    })
  }

  private async decreaseStorageUsage(accountId: ObjectId, fileSizeBytes: number) {
    await helperService.decreaseStorageUsage(accountId, fileSizeBytes)
  }

  private async notifyUploader({
    uploaderId,
    adminId,
    solutionId,
    title,
    body
  }: {
    uploaderId: ObjectId
    adminId: ObjectId
    solutionId: ObjectId
    title: string
    body: string
  }) {
    await databaseService.notifications.insertOne(
      new Notification({
        recipientId: uploaderId,
        senderId: adminId,
        type: NotificationType.solutionUpdated,
        title,
        body,
        refEntity: NotificationRefEntity.solution,
        refEntityId: solutionId,
        priority: NotificationPriority.high
      })
    )
  }

  private async getDocumentOrThrow(solutionId: ObjectId) {
    const document = await databaseService.solutions.findOne({ _id: solutionId })
    if (!document) {
      throw new ErrorWithStatus(DOCUMENT_MESSAGES.DOCUMENT_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
    return document
  }

  async getDocuments(query: AdminDocumentsQuery) {
    const { page, limit, skip } = this.parsePagination(query)
    const filter: Filter<Solution> = {}

    if (query.q) {
      const regex = this.escapeRegex(query.q)
      filter.$or = [
        { title: { $regex: regex, $options: 'i' } },
        { description: { $regex: regex, $options: 'i' } },
        { extractedText: { $regex: regex, $options: 'i' } }
      ]
    }

    if (query.uploaderId) {
      filter.uploaderId = this.toObjectId(query.uploaderId)
    }

    if (query.categoryId) {
      filter.categoryId = this.toObjectId(query.categoryId)
    }

    if (query.isPublic !== undefined) {
      filter.isPublic = this.parseBoolean(query.isPublic)
    }

    if (query.extractionStatus) {
      filter.extractionStatus = query.extractionStatus as ExtractionStatus
    }

    if (query.aiStatus) {
      filter.aiStatus = query.aiStatus as AiStatus
    }

    if (query.status) {
      filter.status = query.status as SolutionStatus
    }

    if (query.flagged !== undefined) {
      filter.flagCount = this.parseBoolean(query.flagged) ? { $gt: 0 } : 0
    }

    const [documents, total] = await Promise.all([
      databaseService.solutions.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      databaseService.solutions.countDocuments(filter)
    ])

    const uploaderIds = [...new Set(documents.map((document) => document.uploaderId.toString()))].map(
      (id) => new ObjectId(id)
    )
    const categoryIds = [
      ...new Set(documents.filter((document) => document.categoryId).map((document) => document.categoryId!.toString()))
    ].map((id) => new ObjectId(id))

    const [uploaders, categories] = await Promise.all([
      databaseService.accounts
        .find({ _id: { $in: uploaderIds } })
        .project<{ _id: ObjectId; fullName: string; email: string; username: string }>({
          _id: 1,
          fullName: 1,
          email: 1,
          username: 1
        })
        .toArray(),
      databaseService.solutionCategories
        .find({ _id: { $in: categoryIds } })
        .project<{ _id: ObjectId; name: string; slug: string }>({ _id: 1, name: 1, slug: 1 })
        .toArray()
    ])

    const uploaderMap = new Map(uploaders.map((uploader) => [uploader._id.toString(), uploader]))
    const categoryMap = new Map(categories.map((category) => [category._id.toString(), category]))

    return {
      data: documents.map((document) => ({
        _id: document._id,
        title: document.title,
        description: document.description,
        isPublic: document.isPublic,
        fileName: document.fileName,
        fileExtension: document.fileExtension,
        fileSizeBytes: document.fileSizeBytes,
        mimeType: document.mimeType,
        uploadedBy: uploaderMap.get(document.uploaderId.toString()) || null,
        category: document.categoryId ? categoryMap.get(document.categoryId.toString()) || null : null,
        extractionStatus: document.extractionStatus,
        aiStatus: document.aiStatus,
        status: document.status,
        flagCount: document.flagCount,
        flagReason: document.flagReason,
        flagCategory: document.flagCategory,
        deletedAt: document.deletedAt,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  async deleteDocument({
    adminId,
    documentId,
    payload
  }: {
    adminId: string
    documentId: string
    payload: AdminDeleteDocumentReqBody
  }) {
    const adminObjectId = this.toObjectId(adminId)
    const solutionId = this.toObjectId(documentId)
    const document = await this.getDocumentOrThrow(solutionId)
    const now = new Date()
    const reason = payload.reason.trim()
    const notifyUser = this.parseBoolean(payload.notifyUser, true)

    const deleted = await databaseService.solutions.findOneAndUpdate(
      { _id: solutionId },
      {
        $set: {
          status: SolutionStatus.archived,
          deletedAt: now,
          deletedBy: adminObjectId,
          deleteReason: reason,
          updatedAt: now
        }
      },
      { returnDocument: 'after' }
    )

    await this.decreaseStorageUsage(document.uploaderId, document.fileSizeBytes)

    if (notifyUser) {
      await this.notifyUploader({
        uploaderId: document.uploaderId,
        adminId: adminObjectId,
        solutionId,
        title: 'Document removed by admin',
        body: reason
      })
    }

    await this.createActivityLog({
      adminId: adminObjectId,
      action: ActivityAction.adminDeleteSolution,
      solutionId,
      metadata: { reason, notifyUser }
    })

    return {
      _id: deleted?._id,
      deletedBy: adminObjectId,
      deletedAt: now
    }
  }

  async flagDocument({
    adminId,
    documentId,
    payload
  }: {
    adminId: string
    documentId: string
    payload: FlagDocumentReqBody
  }) {
    const adminObjectId = this.toObjectId(adminId)
    const solutionId = this.toObjectId(documentId)
    const document = await this.getDocumentOrThrow(solutionId)
    const now = new Date()
    const reason = payload.reason.trim()
    const category = payload.category || 'other'

    await databaseService.solutions.updateOne(
      { _id: solutionId },
      {
        $inc: { flagCount: 1 },
        $set: {
          flaggedAt: now,
          flaggedBy: adminObjectId,
          flagReason: reason,
          flagCategory: category,
          updatedAt: now
        }
      }
    )

    await this.notifyUploader({
      uploaderId: document.uploaderId,
      adminId: adminObjectId,
      solutionId,
      title: 'Document flagged for review',
      body: reason
    })

    await this.createActivityLog({
      adminId: adminObjectId,
      action: ActivityAction.adminFlagSolution,
      solutionId,
      metadata: { reason, category }
    })

    return null
  }
}

const adminDocumentService = new AdminDocumentService()

export default adminDocumentService
