import fs from 'node:fs'
import path from 'node:path'
import { Filter, ObjectId } from 'mongodb'
import {
  ActivityAction,
  ActivityEntityType,
  AiStatus,
  ExtractionStatus,
  SolutionStatus,
  StoragePlan,
  StorageProvider
} from '~/constants/enum'
import HTTP_STATUS from '~/constants/httpStatus'
import { DOCUMENT_MESSAGES, USER_MESSAGES } from '~/constants/message'
import { ActivityLog } from '~/models/ActivityLog.schema'
import { ErrorWithStatus } from '~/models/Error'
import {
  DeleteDocumentReqBody,
  GetDocumentsQuery,
  UpdateDocumentReqBody,
  UploadDocumentReqBody
} from '~/models/request/document.request'
import { Solution } from '~/models/Solution.schema'
import { StorageQuota } from '~/models/StorageQuota.schema'
import databaseService from './database.service'
import extractionService from './extraction.service'
import folderService from './folder.service'

const DEFAULT_TOTAL_BYTES = 500 * 1024 * 1024
const DEFAULT_MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024
const DEFAULT_MAX_FILES_COUNT = 100

type RequestContext = {
  ipAddress?: string
  userAgent?: string
}

class DocumentService {
  private toObjectId(id: string) {
    return new ObjectId(id)
  }

  private async ensureActiveVerifiedAccount(accountId: ObjectId) {
    const account = await databaseService.accounts.findOne({ _id: accountId })

    if (!account) {
      throw new ErrorWithStatus(USER_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    if (!account.isActive) {
      throw new ErrorWithStatus(USER_MESSAGES.USER_IS_INACTIVE, HTTP_STATUS.UNAUTHORIZED)
    }

    if (!account.isEmailVerified) {
      throw new ErrorWithStatus(USER_MESSAGES.USER_NOT_VERIFIED, HTTP_STATUS.FORBIDDEN)
    }

    return account
  }

  private parseBoolean(value: boolean | string | undefined, defaultValue = false) {
    if (typeof value === 'boolean') {
      return value
    }

    if (value === 'true') {
      return true
    }

    if (value === 'false') {
      return false
    }

    return defaultValue
  }

  private parseTags(value: string[] | string | undefined) {
    if (!value) {
      return []
    }

    if (Array.isArray(value)) {
      return value.map((tag) => tag.trim()).filter(Boolean)
    }

    const trimmedValue = value.trim()
    if (!trimmedValue) {
      return []
    }

    try {
      const parsedValue = JSON.parse(trimmedValue)
      if (Array.isArray(parsedValue)) {
        return parsedValue.map((tag) => String(tag).trim()).filter(Boolean)
      }
    } catch {
      // Fall through to comma separated parsing.
    }

    return trimmedValue
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  private getNotDeletedFilter(): Filter<Solution> {
    return {
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }]
    } as Filter<Solution>
  }

  private async validateCategory(categoryId?: string) {
    if (!categoryId) {
      return undefined
    }

    const categoryObjectId = this.toObjectId(categoryId)
    const category = await databaseService.solutionCategories.findOne({
      _id: categoryObjectId,
      isActive: true
    })

    if (!category) {
      throw new ErrorWithStatus(DOCUMENT_MESSAGES.CATEGORY_NOT_FOUND, HTTP_STATUS.UNPROCESSABLE_ENTITY)
    }

    return categoryObjectId
  }

  private async getStorageQuota(accountId: ObjectId) {
    const storageQuota = await databaseService.storageQuotas.findOne({ accountId })

    return (
      storageQuota ||
      new StorageQuota({
        accountId,
        plan: StoragePlan.free,
        totalBytes: DEFAULT_TOTAL_BYTES,
        usedBytes: 0,
        maxFileSizeBytes: DEFAULT_MAX_FILE_SIZE_BYTES,
        maxFilesCount: DEFAULT_MAX_FILES_COUNT
      })
    )
  }

  private async ensureStorageAvailable(accountId: ObjectId, fileSizeBytes: number) {
    const storageQuota = await this.getStorageQuota(accountId)

    if (fileSizeBytes > storageQuota.maxFileSizeBytes) {
      throw new ErrorWithStatus(DOCUMENT_MESSAGES.FILE_TOO_LARGE, HTTP_STATUS.BAD_REQUEST)
    }

    if (storageQuota.usedBytes + fileSizeBytes > storageQuota.totalBytes) {
      throw new ErrorWithStatus(DOCUMENT_MESSAGES.STORAGE_QUOTA_EXCEEDED, HTTP_STATUS.BAD_REQUEST)
    }
  }

  private async increaseStorageUsage(accountId: ObjectId, fileSizeBytes: number) {
    await databaseService.storageQuotas.updateOne(
      { accountId },
      {
        $setOnInsert: {
          accountId,
          plan: StoragePlan.free,
          totalBytes: DEFAULT_TOTAL_BYTES,
          maxFileSizeBytes: DEFAULT_MAX_FILE_SIZE_BYTES,
          maxFilesCount: DEFAULT_MAX_FILES_COUNT,
          aiQueriesUsed: 0,
          aiQueriesLimit: 50,
          quotaResetDate: new Date()
        },
        $inc: { usedBytes: fileSizeBytes },
        $set: { updatedAt: new Date() }
      },
      { upsert: true }
    )
  }

  private async createActivityLog({
    accountId,
    action,
    solutionId,
    metadata,
    context
  }: {
    accountId: ObjectId
    action: ActivityAction
    solutionId: ObjectId
    metadata?: Record<string, unknown>
    context?: RequestContext
  }) {
    await databaseService.activityLogs.insertOne(
      new ActivityLog({
        accountId,
        action,
        entityType: ActivityEntityType.solution,
        entityId: solutionId,
        metadata,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent
      })
    )
  }

  private async getNotDeletedDocument(solutionId: ObjectId) {
    const document = await databaseService.solutions.findOne({
      _id: solutionId,
      ...this.getNotDeletedFilter()
    })

    if (document) {
      return document
    }

    const deletedDocument = await databaseService.solutions.findOne({ _id: solutionId })
    if (deletedDocument?.deletedAt) {
      throw new ErrorWithStatus(DOCUMENT_MESSAGES.DOCUMENT_ALREADY_DELETED, HTTP_STATUS.NOT_FOUND)
    }

    throw new ErrorWithStatus(DOCUMENT_MESSAGES.DOCUMENT_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
  }

  private ensureCanViewDocument(document: Solution, accountId: ObjectId) {
    if (!this.canViewDocument(document, accountId)) {
      throw new ErrorWithStatus(DOCUMENT_MESSAGES.DOCUMENT_ACCESS_DENIED, HTTP_STATUS.FORBIDDEN)
    }
  }

  private ensureCanOwnDocument(document: Solution, accountId: ObjectId, errorMessage: string) {
    if (!document.uploaderId.equals(accountId)) {
      throw new ErrorWithStatus(errorMessage, HTTP_STATUS.FORBIDDEN)
    }
  }

  private async removeUploadedFile(file?: Express.Multer.File) {
    if (!file?.path) {
      return
    }

    try {
      await fs.promises.unlink(file.path)
    } catch {
      // The upload is already failed; file cleanup should not hide the real error.
    }
  }

  private canViewDocument(document: Solution, accountId: ObjectId) {
    return document.isPublic || document.uploaderId.equals(accountId)
  }

  private async getCategoryMap(categoryIds: ObjectId[]) {
    if (!categoryIds.length) {
      return new Map<string, { _id: ObjectId; name: string }>()
    }

    const categories = await databaseService.solutionCategories
      .find({ _id: { $in: categoryIds } })
      .project<{ _id: ObjectId; name: string }>({ _id: 1, name: 1 })
      .toArray()

    return new Map(categories.map((category) => [category._id.toString(), category]))
  }

  private async getBookmarkedSolutionIds(accountId: ObjectId, solutionIds: ObjectId[]) {
    if (!solutionIds.length) {
      return new Set<string>()
    }

    const favorites = await databaseService.favorites
      .find({ accountId, solutionId: { $in: solutionIds } })
      .project<{ solutionId: ObjectId }>({ solutionId: 1 })
      .toArray()

    return new Set(favorites.map((favorite) => favorite.solutionId.toString()))
  }

  private getLocalStorageKey(file: Express.Multer.File) {
    return file.path ? file.path.replace(/\\/g, '/') : `test-memory://${file.originalname}`
  }

  private getLocalFilePath(document: Solution) {
    return path.isAbsolute(document.storageKey) ? document.storageKey : path.resolve(document.storageKey)
  }

  private async decreaseStorageUsage(accountId: ObjectId, fileSizeBytes: number) {
    const storageQuota = await databaseService.storageQuotas.findOne({ accountId })
    if (!storageQuota) {
      return
    }

    await databaseService.storageQuotas.updateOne(
      { accountId },
      {
        $set: {
          usedBytes: Math.max(storageQuota.usedBytes - fileSizeBytes, 0),
          updatedAt: new Date()
        }
      }
    )
  }

  async uploadDocument({
    accountId,
    payload,
    file,
    context
  }: {
    accountId: string
    payload: UploadDocumentReqBody
    file?: Express.Multer.File
    context?: RequestContext
  }) {
    if (!file) {
      throw new ErrorWithStatus(DOCUMENT_MESSAGES.FILE_IS_REQUIRED, HTTP_STATUS.BAD_REQUEST)
    }

    const uploaderId = this.toObjectId(accountId)
    const solutionId = new ObjectId()
    let documentInserted = false
    let storageUsageIncreased = false

    try {
      await this.ensureActiveVerifiedAccount(uploaderId)

      const categoryId = await this.validateCategory(payload.categoryId)
      const folderId = await folderService.validateFolderAccess(payload.folderId, uploaderId)
      await this.ensureStorageAvailable(uploaderId, file.size)

      // Trich xuat text tu tai lieu digital (PDF/DOCX/TXT) ngay khi upload de phuc vu search & AI.
      const extraction = await extractionService.extractText(file)
      const now = new Date()
      const document = new Solution({
        _id: solutionId,
        uploaderId,
        categoryId,
        folderId,
        title: payload.title.trim(),
        description: payload.description?.trim(),
        tags: this.parseTags(payload.tags),
        fileName: file.originalname,
        fileExtension: path.extname(file.originalname).toLowerCase(),
        fileSizeBytes: file.size,
        mimeType: file.mimetype,
        storageProvider: StorageProvider.s3,
        storageBucket: 'local',
        storageKey: this.getLocalStorageKey(file),
        publicUrl: '',
        thumbnailUrl: '',
        status: SolutionStatus.active,
        isPublic: this.parseBoolean(payload.isPublic),
        language: payload.language?.trim() || 'vi',
        aiStatus: AiStatus.pending,
        extractionStatus: extraction.status,
        extractedText: extraction.text,
        extractedAt: extraction.status === ExtractionStatus.completed ? now : undefined,
        extractionErrorMessage: extraction.errorMessage,
        createdAt: now,
        updatedAt: now
      })

      await databaseService.solutions.insertOne(document)
      documentInserted = true
      await this.increaseStorageUsage(uploaderId, file.size)
      storageUsageIncreased = true
      await this.createActivityLog({
        accountId: uploaderId,
        action: ActivityAction.uploadSolution,
        solutionId,
        metadata: { fileName: document.fileName, fileSizeBytes: document.fileSizeBytes },
        context
      })
      await this.createActivityLog({
        accountId: uploaderId,
        action:
          extraction.status === ExtractionStatus.completed
            ? ActivityAction.extractComplete
            : ActivityAction.extractFailed,
        solutionId,
        metadata: {
          extractionStatus: extraction.status,
          extractedChars: extraction.text.length,
          errorMessage: extraction.errorMessage || undefined
        },
        context
      })

      return document
    } catch (error) {
      await Promise.allSettled([
        documentInserted ? databaseService.solutions.deleteOne({ _id: solutionId, uploaderId }) : Promise.resolve(),
        storageUsageIncreased ? this.decreaseStorageUsage(uploaderId, file.size) : Promise.resolve(),
        this.removeUploadedFile(file)
      ])
      throw error
    }
  }

  async getDocuments({ accountId, query }: { accountId: string; query: GetDocumentsQuery }) {
    const userObjectId = this.toObjectId(accountId)
    await this.ensureActiveVerifiedAccount(userObjectId)

    const page = Number(query.page || 1)
    const limit = Number(query.limit || 20)
    const skip = (page - 1) * limit
    const andFilters: Filter<Solution>[] = [
      this.getNotDeletedFilter(),
      {
        $or: [{ uploaderId: userObjectId }, { isPublic: true }]
      }
    ]

    if (query.q) {
      const regex = this.escapeRegex(query.q)
      andFilters.push({
        $or: [
          { title: { $regex: regex, $options: 'i' } },
          { description: { $regex: regex, $options: 'i' } },
          { extractedText: { $regex: regex, $options: 'i' } }
        ]
      })
    }

    if (query.categoryId) {
      andFilters.push({ categoryId: this.toObjectId(query.categoryId) })
    }

    if (query.folderId !== undefined) {
      const folderId = await folderService.validateFolderAccess(query.folderId || null, userObjectId)
      andFilters.push({ uploaderId: userObjectId })
      andFilters.push(
        folderId
          ? { folderId }
          : ({
              $or: [{ folderId: null }, { folderId: { $exists: false } }]
            } as Filter<Solution>)
      )
    }

    if (query.tags) {
      andFilters.push({ tags: { $all: this.parseTags(query.tags) } })
    }

    if (query.isPublic !== undefined) {
      andFilters.push({ isPublic: this.parseBoolean(query.isPublic) })
    }

    if (query.aiStatus) {
      andFilters.push({ aiStatus: query.aiStatus as AiStatus })
    }

    const filter: Filter<Solution> = { $and: andFilters }
    const sortBy = (query.sortBy || 'createdAt') as 'createdAt' | 'title' | 'fileSizeBytes'
    const order = query.order === 'asc' ? 1 : -1

    const [documents, total] = await Promise.all([
      databaseService.solutions
        .find(filter)
        .sort({ [sortBy]: order })
        .skip(skip)
        .limit(limit)
        .toArray(),
      databaseService.solutions.countDocuments(filter)
    ])

    const solutionIds = documents.map((document) => document._id as ObjectId)
    const categoryIds = documents
      .map((document) => document.categoryId)
      .filter((categoryId): categoryId is ObjectId => Boolean(categoryId))
    const [categoryMap, bookmarkedIds] = await Promise.all([
      this.getCategoryMap(categoryIds),
      this.getBookmarkedSolutionIds(userObjectId, solutionIds)
    ])

    return {
      data: documents.map((document) => ({
        _id: document._id,
        uploaderId: document.uploaderId,
        folderId: document.folderId,
        title: document.title,
        category: document.categoryId ? categoryMap.get(document.categoryId.toString()) || null : null,
        tags: document.tags,
        fileName: document.fileName,
        fileExtension: document.fileExtension,
        fileSizeBytes: document.fileSizeBytes,
        mimeType: document.mimeType,
        thumbnailUrl: document.thumbnailUrl,
        isPublic: document.isPublic,
        isBookmarked: bookmarkedIds.has((document._id as ObjectId).toString()),
        aiStatus: document.aiStatus,
        extractionStatus: document.extractionStatus,
        viewCount: document.viewCount,
        downloadCount: document.downloadCount,
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

  async getDocumentDetail({
    accountId,
    documentId,
    context
  }: {
    accountId: string
    documentId: string
    context?: RequestContext
  }) {
    const userObjectId = this.toObjectId(accountId)
    const solutionId = this.toObjectId(documentId)
    await this.ensureActiveVerifiedAccount(userObjectId)

    const document = await this.getNotDeletedDocument(solutionId)
    this.ensureCanViewDocument(document, userObjectId)

    const updatedDocument = await databaseService.solutions.findOneAndUpdate(
      { _id: solutionId },
      { $inc: { viewCount: 1 } },
      { returnDocument: 'after' }
    )
    const visibleDocument = updatedDocument || document

    const [category, uploader, favorite, activeLinksCount] = await Promise.all([
      visibleDocument.categoryId
        ? databaseService.solutionCategories.findOne(
            { _id: visibleDocument.categoryId },
            { projection: { _id: 1, name: 1 } }
          )
        : null,
      databaseService.accounts.findOne(
        { _id: visibleDocument.uploaderId },
        { projection: { _id: 1, fullName: 1, username: 1 } }
      ),
      databaseService.favorites.findOne({ accountId: userObjectId, solutionId }),
      databaseService.permissionLinks.countDocuments({ solutionId, isActive: true })
    ])

    await this.createActivityLog({
      accountId: userObjectId,
      action: ActivityAction.viewSolution,
      solutionId,
      context
    })

    return {
      _id: visibleDocument._id,
      uploaderId: visibleDocument.uploaderId,
      folderId: visibleDocument.folderId,
      category,
      title: visibleDocument.title,
      description: visibleDocument.description,
      tags: visibleDocument.tags,
      fileName: visibleDocument.fileName,
      fileExtension: visibleDocument.fileExtension,
      fileSizeBytes: visibleDocument.fileSizeBytes,
      mimeType: visibleDocument.mimeType,
      thumbnailUrl: visibleDocument.thumbnailUrl,
      pageCount: visibleDocument.pageCount,
      status: visibleDocument.status,
      aiStatus: visibleDocument.aiStatus,
      extractionStatus: visibleDocument.extractionStatus,
      isPublic: visibleDocument.isPublic,
      isBookmarked: Boolean(favorite),
      viewCount: visibleDocument.viewCount,
      downloadCount: visibleDocument.downloadCount,
      shareInfo: {
        isShared: activeLinksCount > 0,
        activeLinksCount
      },
      uploadedBy: uploader
        ? {
            _id: uploader._id,
            fullName: uploader.fullName,
            username: uploader.username
          }
        : null,
      createdAt: visibleDocument.createdAt,
      updatedAt: visibleDocument.updatedAt
    }
  }

  async updateDocument({
    accountId,
    documentId,
    payload,
    context
  }: {
    accountId: string
    documentId: string
    payload: UpdateDocumentReqBody
    context?: RequestContext
  }) {
    const userObjectId = this.toObjectId(accountId)
    const solutionId = this.toObjectId(documentId)
    await this.ensureActiveVerifiedAccount(userObjectId)

    const document = await this.getNotDeletedDocument(solutionId)
    this.ensureCanOwnDocument(document, userObjectId, DOCUMENT_MESSAGES.DOCUMENT_UPDATE_DENIED)

    const updateData: Partial<Solution> = {
      updatedAt: new Date()
    }
    const changedFields: string[] = []

    if (payload.title !== undefined) {
      updateData.title = payload.title.trim()
      changedFields.push('title')
    }

    if (payload.description !== undefined) {
      updateData.description = payload.description.trim()
      changedFields.push('description')
    }

    if (payload.categoryId !== undefined) {
      updateData.categoryId = await this.validateCategory(payload.categoryId)
      changedFields.push('categoryId')
    }

    if (payload.folderId !== undefined) {
      updateData.folderId = await folderService.validateFolderAccess(payload.folderId, userObjectId)
      changedFields.push('folderId')
    }

    if (payload.tags !== undefined) {
      updateData.tags = this.parseTags(payload.tags)
      changedFields.push('tags')
    }

    if (payload.isPublic !== undefined) {
      updateData.isPublic = this.parseBoolean(payload.isPublic)
      changedFields.push('isPublic')
    }

    if (payload.language !== undefined) {
      updateData.language = payload.language.trim()
      changedFields.push('language')
    }

    const updatedDocument = await databaseService.solutions.findOneAndUpdate(
      { _id: solutionId },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (!updatedDocument) {
      throw new ErrorWithStatus(DOCUMENT_MESSAGES.DOCUMENT_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    await this.createActivityLog({
      accountId: userObjectId,
      action: ActivityAction.updateSolutionMeta,
      solutionId,
      metadata: { changedFields },
      context
    })

    return {
      _id: updatedDocument._id,
      title: updatedDocument.title,
      description: updatedDocument.description,
      categoryId: updatedDocument.categoryId,
      folderId: updatedDocument.folderId,
      tags: updatedDocument.tags,
      isPublic: updatedDocument.isPublic,
      language: updatedDocument.language,
      updatedAt: updatedDocument.updatedAt
    }
  }

  async getUploadStatus({ accountId, documentId }: { accountId: string; documentId: string }) {
    const userObjectId = this.toObjectId(accountId)
    const solutionId = this.toObjectId(documentId)
    await this.ensureActiveVerifiedAccount(userObjectId)

    const document = await this.getNotDeletedDocument(solutionId)
    this.ensureCanViewDocument(document, userObjectId)

    return {
      _id: document._id,
      fileName: document.fileName,
      fileSizeBytes: document.fileSizeBytes,
      status: document.status,
      aiStatus: document.aiStatus,
      aiErrorMessage: document.aiErrorMessage,
      extractionStatus: document.extractionStatus,
      extractionErrorMessage: document.extractionErrorMessage,
      storageProvider: document.storageProvider,
      storageBucket: document.storageBucket,
      storageKey: document.storageKey,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    }
  }

  async downloadDocument({
    accountId,
    documentId,
    context
  }: {
    accountId: string
    documentId: string
    context?: RequestContext
  }) {
    const userObjectId = this.toObjectId(accountId)
    const solutionId = this.toObjectId(documentId)
    await this.ensureActiveVerifiedAccount(userObjectId)

    const document = await this.getNotDeletedDocument(solutionId)
    this.ensureCanViewDocument(document, userObjectId)

    const filePath = this.getLocalFilePath(document)
    if (!fs.existsSync(filePath)) {
      throw new ErrorWithStatus(DOCUMENT_MESSAGES.DOCUMENT_FILE_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    await databaseService.solutions.updateOne({ _id: solutionId }, { $inc: { downloadCount: 1 } })
    await this.createActivityLog({
      accountId: userObjectId,
      action: ActivityAction.downloadSolution,
      solutionId,
      metadata: { fileName: document.fileName, fileSizeBytes: document.fileSizeBytes },
      context
    })

    return {
      document,
      filePath
    }
  }

  async deleteDocument({
    accountId,
    documentId,
    payload,
    context
  }: {
    accountId: string
    documentId: string
    payload?: DeleteDocumentReqBody
    context?: RequestContext
  }) {
    const userObjectId = this.toObjectId(accountId)
    const solutionId = this.toObjectId(documentId)
    await this.ensureActiveVerifiedAccount(userObjectId)

    const document = await this.getNotDeletedDocument(solutionId)
    this.ensureCanOwnDocument(document, userObjectId, DOCUMENT_MESSAGES.DOCUMENT_DELETE_DENIED)

    const now = new Date()
    const deleteReason = payload?.deleteReason?.trim() || 'User deleted document'
    const autoDeleteAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const deletedDocument = await databaseService.solutions.findOneAndUpdate(
      { _id: solutionId },
      {
        $set: {
          status: SolutionStatus.archived,
          deletedAt: now,
          deletedBy: userObjectId,
          deleteReason,
          autoDeleteAt,
          updatedAt: now
        }
      },
      { returnDocument: 'after' }
    )

    if (!deletedDocument) {
      throw new ErrorWithStatus(DOCUMENT_MESSAGES.DOCUMENT_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    await this.decreaseStorageUsage(userObjectId, document.fileSizeBytes)
    await this.createActivityLog({
      accountId: userObjectId,
      action: ActivityAction.deleteSolution,
      solutionId,
      metadata: { deleteReason, fileName: document.fileName, fileSizeBytes: document.fileSizeBytes },
      context
    })

    return {
      _id: deletedDocument._id,
      status: deletedDocument.status,
      deletedAt: deletedDocument.deletedAt,
      deletedBy: deletedDocument.deletedBy,
      deleteReason: deletedDocument.deleteReason,
      autoDeleteAt: deletedDocument.autoDeleteAt,
      updatedAt: deletedDocument.updatedAt
    }
  }
}

const documentService = new DocumentService()

export default documentService
