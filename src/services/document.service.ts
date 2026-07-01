import fs from 'node:fs'
import path from 'node:path'
import { Filter, ObjectId } from 'mongodb'
import {
  ActivityAction,
  ActivityEntityType,
  AiStatus,
  ExtractionStatus,
  SolutionStatus,
  StorageProvider
} from '~/constants/enum'
import HTTP_STATUS from '~/constants/httpStatus'
import { DOCUMENT_MESSAGES } from '~/constants/message'
import { ErrorWithStatus } from '~/models/Error'
import {
  DeleteDocumentReqBody,
  GetDocumentsQuery,
  UpdateDocumentReqBody,
  UploadDocumentReqBody
} from '~/models/request/document.request'
import { RequestContext } from '~/models/request/common.request'
import { Solution } from '~/models/Solution.schema'
import { DocumentExtractionJob } from '~/models/DocumentExtractionJob.schema'
import { CloudinaryStorage, LocalStorage, storageAdapter, UploadResult } from '~/services/storage'
import databaseService from './database.service'
import folderService from './folder.service'
import helperService from './helpers/helper.service'

const localStorage = new LocalStorage()
const cloudStorage = new CloudinaryStorage()

class DocumentService {
  private toObjectId(id: string) {
    return helperService.toObjectId(id)
  }

  private async ensureActiveVerifiedAccount(accountId: ObjectId) {
    return helperService.ensureActiveVerifiedAccount(accountId)
  }

  private parseBoolean(value: boolean | string | undefined, defaultValue = false) {
    return helperService.parseBoolean(value, defaultValue)
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
    return helperService.escapeRegex(value)
  }

  private getNotDeletedFilter(): Filter<Solution> {
    return helperService.getNotDeletedFilter<Solution>()
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
    return helperService.getStorageQuota(accountId)
  }

  private async ensureStorageAvailable(accountId: ObjectId, fileSizeBytes: number) {
    await helperService.ensureStorageAvailable(accountId, fileSizeBytes)
  }

  private async increaseStorageUsage(accountId: ObjectId, fileSizeBytes: number) {
    await helperService.increaseStorageUsage(accountId, fileSizeBytes)
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
    await helperService.createActivityLog({
      accountId,
      action,
      entityType: ActivityEntityType.solution,
      entityId: solutionId,
      metadata,
      context
    })
  }

  private async getNotDeletedDocument(solutionId: ObjectId) {
    return helperService.getNotDeletedDocument(solutionId, { includeDeletedMessage: true })
  }

  private ensureCanViewDocument(document: Solution, accountId: ObjectId) {
    helperService.ensureCanViewDocument(document, accountId)
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
    return helperService.canViewDocument(document, accountId)
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

  private getResourceType(mimeType: string): 'raw' | 'image' | 'auto' {
    if (mimeType.startsWith('image/')) {
      return 'image'
    }
    return 'raw'
  }

  private isLocalFile(document: Solution): boolean {
    return document.storageBucket === 'local'
  }

  private isCloudFile(document: Solution): boolean {
    return (
      document.storageProvider === StorageProvider.cloudinary ||
      document.storageKey.startsWith('https://') ||
      document.storageKey.startsWith('http://')
    )
  }

  private getLocalFilePath(document: Solution) {
    return path.isAbsolute(document.storageKey) ? document.storageKey : path.resolve(document.storageKey)
  }

  private getStorageReadAdapter(document: Solution) {
    return this.isCloudFile(document) ? cloudStorage : localStorage
  }

  private async hasActiveShareLinks(solutionId: ObjectId) {
    const activeLinksCount = await databaseService.permissionLinks.countDocuments({ solutionId, isActive: true })
    return activeLinksCount > 0
  }

  private getVisiblePublicUrl(document: Solution) {
    return document.publicUrl || ''
  }

  private formatDocumentForClient(document: Solution) {
    return {
      _id: document._id,
      uploaderId: document.uploaderId,
      categoryId: document.categoryId,
      folderId: document.folderId,
      title: document.title,
      description: document.description,
      tags: document.tags,
      fileName: document.fileName,
      fileExtension: document.fileExtension,
      fileSizeBytes: document.fileSizeBytes,
      mimeType: document.mimeType,
      publicUrl: this.getVisiblePublicUrl(document),
      thumbnailUrl: document.thumbnailUrl,
      status: document.status,
      isPublic: document.isPublic,
      viewCount: document.viewCount,
      downloadCount: document.downloadCount,
      language: document.language,
      pageCount: document.pageCount,
      aiStatus: document.aiStatus,
      aiErrorMessage: document.aiErrorMessage,
      extractionStatus: document.extractionStatus,
      extractedText: document.extractedText,
      extractedAt: document.extractedAt,
      extractionErrorMessage: document.extractionErrorMessage,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    }
  }

  private async decreaseStorageUsage(accountId: ObjectId, fileSizeBytes: number) {
    await helperService.decreaseStorageUsage(accountId, fileSizeBytes)
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
    let jobInserted = false
    let storageUsageIncreased = false
    let uploadResult: UploadResult | undefined = undefined

    try {
      await this.ensureActiveVerifiedAccount(uploaderId)

      const categoryId = await this.validateCategory(payload.categoryId)
      const folderId = await folderService.validateFolderAccess(payload.folderId, uploaderId)
      await this.ensureStorageAvailable(uploaderId, file.size)

      // Upload file len storage adapter
      uploadResult = await storageAdapter.upload(file, {
        folder: 'documents',
        resourceType: this.getResourceType(file.mimetype),
        originalName: file.originalname
      })

      const isPublic = this.parseBoolean(payload.isPublic)

      // Trich xuat text se duoc xu ly bat dong bo qua worker de tang toc do upload.
      // Trang thai cua Solution se duoc dat la pending.
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
        storageProvider: uploadResult.provider,
        storageBucket: uploadResult.storageBucket,
        storageKey: uploadResult.storageKey,
        publicUrl: '',
        thumbnailUrl: uploadResult.thumbnailUrl,
        status: SolutionStatus.active,
        isPublic,
        language: payload.language?.trim() || 'vi',
        aiStatus: AiStatus.pending,
        extractionStatus: ExtractionStatus.pending,
        extractedText: '',
        extractedAt: undefined,
        extractionErrorMessage: '',
        createdAt: now,
        updatedAt: now
      })

      await databaseService.solutions.insertOne(document)
      documentInserted = true

      // Tao job cho worker xu ly viec trich xuat
      const job = new DocumentExtractionJob({
        solutionId,
        uploaderId,
        storageKey: document.storageKey,
        storageProvider: document.storageProvider,
        storageBucket: document.storageBucket,
        fileExtension: document.fileExtension,
        mimeType: document.mimeType
      })
      await databaseService.documentExtractionJobs.insertOne(job)
      jobInserted = true

      await this.increaseStorageUsage(uploaderId, file.size)
      storageUsageIncreased = true
      await this.createActivityLog({
        accountId: uploaderId,
        action: ActivityAction.uploadSolution,
        solutionId,
        metadata: { fileName: document.fileName, fileSizeBytes: document.fileSizeBytes },
        context
      })

      // Cleanup local temp file neu upload len cloud (cloudinary)
      if (uploadResult.provider === StorageProvider.cloudinary) {
        await this.removeUploadedFile(file)
      }

      return this.formatDocumentForClient(document)
    } catch (error) {
      await Promise.allSettled([
        documentInserted ? databaseService.solutions.deleteOne({ _id: solutionId, uploaderId }) : Promise.resolve(),
        jobInserted ? databaseService.documentExtractionJobs.deleteOne({ solutionId }) : Promise.resolve(),
        storageUsageIncreased ? this.decreaseStorageUsage(uploaderId, file.size) : Promise.resolve(),
        // Rollback cloud upload neu insert db that bai
        uploadResult && uploadResult.provider === StorageProvider.cloudinary
          ? storageAdapter.delete(uploadResult.storageKey)
          : Promise.resolve(),
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
      publicUrl: this.getVisiblePublicUrl(visibleDocument),
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
      const isPublic = this.parseBoolean(payload.isPublic)
      updateData.isPublic = isPublic
      if (!isPublic && !(await this.hasActiveShareLinks(solutionId))) {
        updateData.publicUrl = ''
      }
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
      publicUrl: this.getVisiblePublicUrl(updatedDocument),
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
      publicUrl: this.getVisiblePublicUrl(document),
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

    // Neu dung cloud storage thi proxy stream qua API, khong expose storageKey cho client.
    if (this.isCloudFile(document)) {
      const fileStream = await this.getStorageReadAdapter(document).getFileStream(document.storageKey)
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
        fileStream
      }
    }

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
