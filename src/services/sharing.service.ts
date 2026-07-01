import crypto from 'node:crypto'
import { Filter, ObjectId } from 'mongodb'
import { BASE_URL } from '~/constants/base'
import { ActivityAction, ActivityEntityType, PermissionLevel, StorageProvider } from '~/constants/enum'
import HTTP_STATUS from '~/constants/httpStatus'
import { BOOKMARK_MESSAGES, SHARING_MESSAGES } from '~/constants/message'
import { ErrorWithStatus } from '~/models/Error'
import { Favorite } from '~/models/Favorite.schema'
import { PermissionLink } from '~/models/PermissionLink.schema'
import { AddBookmarkReqBody, CreateShareLinkReqBody, GetBookmarksQuery } from '~/models/request/sharing.request'
import { RequestContext } from '~/models/request/common.request'
import { Solution } from '~/models/Solution.schema'
import { CloudinaryStorage, LocalStorage } from './storage'
import databaseService from './database.service'
import helperService from './helpers/helper.service'

const localStorage = new LocalStorage()
const cloudStorage = new CloudinaryStorage()

class SharingService {
  private toObjectId(id: string) {
    return helperService.toObjectId(id)
  }

  private parseBoolean(value: boolean | string | undefined, defaultValue = false) {
    return helperService.parseBoolean(value, defaultValue)
  }

  private parseNullablePositiveInt(value: number | string | null | undefined) {
    if (value === undefined || value === null || value === '') {
      return null
    }

    return Number(value)
  }

  private parseExpiresAt(value: number | string | null | undefined, now: Date) {
    if (value === undefined || value === null || value === '') {
      return null
    }

    const expiresInDays = Number(value)
    if (expiresInDays <= 0) {
      return null
    }

    return new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000)
  }

  private getShareUrl(token: string) {
    return `${BASE_URL.replace(/\/$/, '')}/shared/${token}`
  }

  private getSharedFileUrl(token: string) {
    return `${this.getShareUrl(token)}/file`
  }

  private async ensurePublicUrlForShare(document: Solution, token: string) {
    const publicUrl = this.getShareUrl(token)
    if (!document.publicUrl) {
      await databaseService.solutions.updateOne({ _id: document._id }, { $set: { publicUrl, updatedAt: new Date() } })
      document.publicUrl = publicUrl
    }

    return publicUrl
  }

  private getStorageAdapter(document: Solution) {
    return document.storageProvider === StorageProvider.cloudinary ||
      document.storageKey.startsWith('https://') ||
      document.storageKey.startsWith('http://')
      ? cloudStorage
      : localStorage
  }

  private getNotDeletedFilter(): Filter<Solution> {
    return helperService.getNotDeletedFilter<Solution>()
  }

  private canViewDocument(document: Solution, accountId: ObjectId) {
    return helperService.canViewDocument(document, accountId)
  }

  private async ensureActiveVerifiedAccount(accountId: ObjectId) {
    return helperService.ensureActiveVerifiedAccount(accountId)
  }

  private async getNotDeletedDocument(solutionId: ObjectId) {
    return helperService.getNotDeletedDocument(solutionId)
  }

  private ensureCanViewDocument(document: Solution, accountId: ObjectId) {
    helperService.ensureCanViewDocument(document, accountId)
  }

  private ensureDocumentOwner(document: Solution, accountId: ObjectId) {
    if (!document.uploaderId.equals(accountId)) {
      throw new ErrorWithStatus(SHARING_MESSAGES.SHARE_LINK_OWNER_REQUIRED, HTTP_STATUS.FORBIDDEN)
    }
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

  private formatShareLink(link: PermissionLink) {
    return {
      _id: link._id,
      solutionId: link.solutionId,
      createdBy: link.createdBy,
      token: link.token,
      shareUrl: this.getShareUrl(link.token),
      permissionLevel: link.permissionLevel,
      canView: link.canView,
      canDownload: link.canDownload,
      canComment: link.canComment,
      requiresLogin: link.requiresLogin,
      maxUses: link.maxUses,
      currentUses: link.currentUses,
      expiresAt: link.expiresAt,
      isActive: link.isActive,
      note: link.note,
      lastUsedAt: link.lastUsedAt,
      createdAt: link.createdAt
    }
  }

  private async createUniqueShareToken() {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const token = crypto.randomBytes(24).toString('base64url')
      const existingLink = await databaseService.permissionLinks.findOne({ token })
      if (!existingLink) {
        return token
      }
    }

    throw new ErrorWithStatus(SHARING_MESSAGES.SHARE_TOKEN_GENERATION_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }

  async addBookmark({
    accountId,
    documentId,
    payload,
    context
  }: {
    accountId: string
    documentId: string
    payload: AddBookmarkReqBody
    context?: RequestContext
  }) {
    const userObjectId = this.toObjectId(accountId)
    const solutionId = this.toObjectId(documentId)
    await this.ensureActiveVerifiedAccount(userObjectId)

    const document = await this.getNotDeletedDocument(solutionId)
    this.ensureCanViewDocument(document, userObjectId)

    const favorite = new Favorite({
      _id: new ObjectId(),
      accountId: userObjectId,
      solutionId,
      note: payload.note?.trim()
    })

    const result = await databaseService.favorites.updateOne(
      { accountId: userObjectId, solutionId },
      { $setOnInsert: favorite },
      { upsert: true }
    )

    const savedFavorite = await databaseService.favorites.findOne({ accountId: userObjectId, solutionId })
    if (!savedFavorite) {
      throw new ErrorWithStatus(BOOKMARK_MESSAGES.BOOKMARK_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    if (result.upsertedCount > 0) {
      await this.createActivityLog({
        accountId: userObjectId,
        action: ActivityAction.favoriteAdd,
        solutionId,
        metadata: { favoriteId: savedFavorite._id },
        context
      })
    }

    return savedFavorite
  }

  async removeBookmark({
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

    const result = await databaseService.favorites.deleteOne({ accountId: userObjectId, solutionId })
    if (result.deletedCount > 0) {
      await this.createActivityLog({
        accountId: userObjectId,
        action: ActivityAction.favoriteRemove,
        solutionId,
        context
      })
    }
  }

  async getMyBookmarks({ accountId, query }: { accountId: string; query: GetBookmarksQuery }) {
    const userObjectId = this.toObjectId(accountId)
    await this.ensureActiveVerifiedAccount(userObjectId)

    const page = Number(query.page || 1)
    const limit = Number(query.limit || 20)
    const skip = (page - 1) * limit
    const visibilityMatch = {
      $or: [{ 'solution.uploaderId': userObjectId }, { 'solution.isPublic': true }]
    }
    const notDeletedMatch = {
      $or: [{ 'solution.deletedAt': { $exists: false } }, { 'solution.deletedAt': null }]
    }

    const [result] = await databaseService.favorites
      .aggregate([
        { $match: { accountId: userObjectId } },
        { $lookup: { from: 'solutions', localField: 'solutionId', foreignField: '_id', as: 'solution' } },
        { $unwind: '$solution' },
        { $match: notDeletedMatch },
        { $match: visibilityMatch },
        { $sort: { createdAt: -1 } },
        {
          $facet: {
            data: [{ $skip: skip }, { $limit: limit }],
            total: [{ $count: 'count' }]
          }
        }
      ])
      .toArray()

    const data = ((result?.data || []) as Array<Favorite & { solution: Solution }>).map((favorite) => ({
      _id: favorite._id,
      solution: {
        _id: favorite.solution._id,
        title: favorite.solution.title,
        thumbnailUrl: favorite.solution.thumbnailUrl,
        tags: favorite.solution.tags,
        fileExtension: favorite.solution.fileExtension,
        fileSizeBytes: favorite.solution.fileSizeBytes,
        isPublic: favorite.solution.isPublic,
        createdAt: favorite.solution.createdAt,
        updatedAt: favorite.solution.updatedAt
      },
      note: favorite.note,
      createdAt: favorite.createdAt
    }))
    const total = Number(result?.total?.[0]?.count || 0)

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  async createShareLink({
    accountId,
    documentId,
    payload,
    context
  }: {
    accountId: string
    documentId: string
    payload: CreateShareLinkReqBody
    context?: RequestContext
  }) {
    const userObjectId = this.toObjectId(accountId)
    const solutionId = this.toObjectId(documentId)
    await this.ensureActiveVerifiedAccount(userObjectId)

    const document = await this.getNotDeletedDocument(solutionId)
    this.ensureDocumentOwner(document, userObjectId)

    const now = new Date()
    const link = new PermissionLink({
      _id: new ObjectId(),
      solutionId,
      createdBy: userObjectId,
      token: await this.createUniqueShareToken(),
      permissionLevel: payload.permissionLevel || PermissionLevel.viewer,
      canView: true,
      canDownload: this.parseBoolean(payload.canDownload),
      canComment: this.parseBoolean(payload.canComment),
      requiresLogin: this.parseBoolean(payload.requiresLogin),
      passwordHash: payload.passwordHash?.trim(),
      maxUses: this.parseNullablePositiveInt(payload.maxUses) as number,
      currentUses: 0,
      expiresAt: this.parseExpiresAt(payload.expiresInDays, now) as Date,
      isActive: true,
      note: payload.note?.trim(),
      createdAt: now
    })

    await databaseService.permissionLinks.insertOne(link)
    await this.ensurePublicUrlForShare(document, link.token)
    await this.createActivityLog({
      accountId: userObjectId,
      action: ActivityAction.shareLinkCreate,
      solutionId,
      metadata: { permissionLinkId: link._id, permissionLevel: link.permissionLevel },
      context
    })

    return this.formatShareLink(link)
  }

  async getShareLinks({ accountId, documentId }: { accountId: string; documentId: string }) {
    const userObjectId = this.toObjectId(accountId)
    const solutionId = this.toObjectId(documentId)
    await this.ensureActiveVerifiedAccount(userObjectId)

    const document = await this.getNotDeletedDocument(solutionId)
    this.ensureDocumentOwner(document, userObjectId)

    const links = await databaseService.permissionLinks.find({ solutionId }).sort({ createdAt: -1 }).toArray()
    return links.map((link) => this.formatShareLink(link))
  }

  async revokeShareLink({
    accountId,
    documentId,
    shareId,
    context
  }: {
    accountId: string
    documentId: string
    shareId: string
    context?: RequestContext
  }) {
    const userObjectId = this.toObjectId(accountId)
    const solutionId = this.toObjectId(documentId)
    const permissionLinkId = this.toObjectId(shareId)
    await this.ensureActiveVerifiedAccount(userObjectId)

    const document = await this.getNotDeletedDocument(solutionId)
    this.ensureDocumentOwner(document, userObjectId)

    const link = await databaseService.permissionLinks.findOne({ _id: permissionLinkId, solutionId })
    if (!link) {
      throw new ErrorWithStatus(SHARING_MESSAGES.SHARE_LINK_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    const result = await databaseService.permissionLinks.updateOne(
      { _id: permissionLinkId, solutionId },
      { $set: { isActive: false } }
    )

    if (result.modifiedCount > 0) {
      if (!document.isPublic) {
        const activeLinksCount = await databaseService.permissionLinks.countDocuments({ solutionId, isActive: true })
        if (activeLinksCount === 0) {
          await databaseService.solutions.updateOne({ _id: solutionId }, { $set: { publicUrl: '', updatedAt: new Date() } })
        }
      }

      await this.createActivityLog({
        accountId: userObjectId,
        action: ActivityAction.shareLinkRevoke,
        solutionId,
        metadata: { permissionLinkId },
        context
      })
    }
  }

  async resolveSharedLink({ token, context }: { token: string; context?: RequestContext }) {
    const link = await databaseService.permissionLinks.findOne({ token, isActive: true })
    if (!link) {
      throw new ErrorWithStatus(SHARING_MESSAGES.SHARE_LINK_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    const now = new Date()
    if (link.expiresAt && link.expiresAt <= now) {
      throw new ErrorWithStatus(SHARING_MESSAGES.SHARE_LINK_EXPIRED, HTTP_STATUS.FORBIDDEN)
    }

    if (link.maxUses !== null && link.currentUses >= link.maxUses) {
      throw new ErrorWithStatus(SHARING_MESSAGES.SHARE_LINK_USAGE_LIMIT_REACHED, HTTP_STATUS.FORBIDDEN)
    }

    const document = await this.getNotDeletedDocument(link.solutionId)
    const [sharedBy] = await Promise.all([
      databaseService.accounts.findOne(
        { _id: link.createdBy },
        { projection: { _id: 1, fullName: 1, username: 1, email: 1 } }
      ),
      databaseService.permissionLinks.updateOne(
        { _id: link._id },
        {
          $inc: { currentUses: 1 },
          $set: { lastUsedAt: now }
        }
      ),
      this.createActivityLog({
        accountId: link.createdBy,
        action: ActivityAction.shareLinkUse,
        solutionId: link.solutionId,
        metadata: { permissionLinkId: link._id, token: link.token, publicAccess: true },
        context
      })
    ])
    await this.ensurePublicUrlForShare(document, link.token)
    const fileUrl = this.getSharedFileUrl(link.token)

    return {
      solution: {
        _id: document._id,
        title: document.title,
        description: document.description,
        fileName: document.fileName,
        fileExtension: document.fileExtension,
        fileSizeBytes: document.fileSizeBytes,
        mimeType: document.mimeType,
        thumbnailUrl: document.thumbnailUrl,
        tags: document.tags,
        language: document.language,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt
      },
      permissionLevel: link.permissionLevel,
      canDownload: link.canDownload,
      canComment: link.canComment,
      previewUrl: fileUrl,
      downloadUrl: link.canDownload ? `${fileUrl}?download=1` : null,
      sharedBy: sharedBy
        ? {
            _id: sharedBy._id,
            fullName: sharedBy.fullName,
            username: sharedBy.username,
            email: sharedBy.email
          }
        : null,
      expiresAt: link.expiresAt
    }
  }

  async getSharedFile({ token, download = false }: { token: string; download?: boolean }) {
    const link = await databaseService.permissionLinks.findOne({ token, isActive: true })
    if (!link) {
      throw new ErrorWithStatus(SHARING_MESSAGES.SHARE_LINK_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }

    const now = new Date()
    if (link.expiresAt && link.expiresAt <= now) {
      throw new ErrorWithStatus(SHARING_MESSAGES.SHARE_LINK_EXPIRED, HTTP_STATUS.FORBIDDEN)
    }

    if (link.maxUses !== null && link.currentUses >= link.maxUses) {
      throw new ErrorWithStatus(SHARING_MESSAGES.SHARE_LINK_USAGE_LIMIT_REACHED, HTTP_STATUS.FORBIDDEN)
    }

    if (download && !link.canDownload) {
      throw new ErrorWithStatus(SHARING_MESSAGES.SHARE_LINK_DOWNLOAD_DENIED, HTTP_STATUS.FORBIDDEN)
    }

    const document = await this.getNotDeletedDocument(link.solutionId)
    await this.ensurePublicUrlForShare(document, link.token)
    const stream = await this.getStorageAdapter(document).getFileStream(document.storageKey)

    return {
      document,
      stream
    }
  }
}

const sharingService = new SharingService()

export default sharingService
