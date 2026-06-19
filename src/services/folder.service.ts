import { Filter, ObjectId } from 'mongodb'
import { SolutionStatus } from '~/constants/enum'
import HTTP_STATUS from '~/constants/httpStatus'
import { FOLDER_MESSAGES, USER_MESSAGES } from '~/constants/message'
import { ErrorWithStatus } from '~/models/Error'
import { Folder } from '~/models/Folder.schema'
import {
  CreateFolderReqBody,
  GetFolderContentsQuery,
  MoveFolderReqBody,
  UpdateFolderReqBody
} from '~/models/request/folder.request'
import { Solution } from '~/models/Solution.schema'
import databaseService from './database.service'

class FolderService {
  private toObjectId(id: string) {
    return new ObjectId(id)
  }

  private getNotDeletedFolderFilter(): Filter<Folder> {
    return {
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }]
    } as Filter<Folder>
  }

  private getNotDeletedDocumentFilter(): Filter<Solution> {
    return {
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }]
    } as Filter<Solution>
  }

  private getRootFolderFilter(): Filter<Folder> {
    return {
      $or: [{ parentId: null }, { parentId: { $exists: false } }]
    } as Filter<Folder>
  }

  private getRootDocumentFilter(): Filter<Solution> {
    return {
      $or: [{ folderId: null }, { folderId: { $exists: false } }]
    } as Filter<Solution>
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
  }

  private async getOwnedFolder(folderId: ObjectId, ownerId: ObjectId) {
    const folder = await databaseService.folders.findOne({
      _id: folderId,
      ...this.getNotDeletedFolderFilter()
    })

    if (!folder) {
      throw new ErrorWithStatus(FOLDER_MESSAGES.FOLDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
    if (!folder.ownerId.equals(ownerId)) {
      throw new ErrorWithStatus(FOLDER_MESSAGES.FOLDER_ACCESS_DENIED, HTTP_STATUS.FORBIDDEN)
    }

    return folder
  }

  private async ensureParentFolder(parentId: ObjectId, ownerId: ObjectId) {
    const parent = await databaseService.folders.findOne({
      _id: parentId,
      ...this.getNotDeletedFolderFilter()
    })

    if (!parent) {
      throw new ErrorWithStatus(FOLDER_MESSAGES.PARENT_FOLDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
    if (!parent.ownerId.equals(ownerId)) {
      throw new ErrorWithStatus(FOLDER_MESSAGES.FOLDER_ACCESS_DENIED, HTTP_STATUS.FORBIDDEN)
    }

    return parent
  }

  private async getBreadcrumbs(folder: Folder, ownerId: ObjectId) {
    const breadcrumbs: Pick<Folder, '_id' | 'name' | 'parentId'>[] = []
    const visited = new Set<string>()
    let current: Folder | null = folder

    while (current) {
      const currentId = current._id as ObjectId
      const currentKey = currentId.toString()
      if (visited.has(currentKey)) {
        break
      }

      visited.add(currentKey)
      breadcrumbs.unshift({ _id: currentId, name: current.name, parentId: current.parentId })

      if (!current.parentId) {
        break
      }

      current = await databaseService.folders.findOne({
        _id: current.parentId,
        ownerId,
        ...this.getNotDeletedFolderFilter()
      })
    }

    return breadcrumbs
  }

  private async ensureMoveDoesNotCreateCycle(sourceId: ObjectId, candidateParent: Folder, ownerId: ObjectId) {
    const visited = new Set<string>()
    let current: Folder | null = candidateParent

    while (current) {
      const currentId = current._id as ObjectId
      if (currentId.equals(sourceId)) {
        throw new ErrorWithStatus(FOLDER_MESSAGES.CANNOT_MOVE_FOLDER_TO_DESCENDANT, HTTP_STATUS.BAD_REQUEST)
      }

      const currentKey = currentId.toString()
      if (visited.has(currentKey) || !current.parentId) {
        return
      }

      visited.add(currentKey)
      current = await databaseService.folders.findOne({
        _id: current.parentId,
        ownerId,
        ...this.getNotDeletedFolderFilter()
      })
    }
  }

  private async getSubtreeFolderIds(rootId: ObjectId, ownerId: ObjectId) {
    const result = [rootId]
    const visited = new Set([rootId.toString()])
    let parentIds = [rootId]

    while (parentIds.length) {
      const children = await databaseService.folders
        .find({
          ownerId,
          parentId: { $in: parentIds },
          ...this.getNotDeletedFolderFilter()
        })
        .project<{ _id: ObjectId }>({ _id: 1 })
        .toArray()

      parentIds = children
        .map((child) => child._id)
        .filter((id) => {
          const key = id.toString()
          if (visited.has(key)) {
            return false
          }
          visited.add(key)
          result.push(id)
          return true
        })
    }

    return result
  }

  async validateFolderAccess(folderId: string | null | undefined, accountId: ObjectId) {
    if (!folderId) {
      return null
    }

    const folderObjectId = this.toObjectId(folderId)
    await this.getOwnedFolder(folderObjectId, accountId)
    return folderObjectId
  }

  async createFolder(accountId: string, payload: CreateFolderReqBody) {
    const ownerId = this.toObjectId(accountId)
    await this.ensureActiveVerifiedAccount(ownerId)

    const parentId = payload.parentId ? this.toObjectId(payload.parentId) : null
    if (parentId) {
      await this.ensureParentFolder(parentId, ownerId)
    }

    const folder = new Folder({
      _id: new ObjectId(),
      ownerId,
      name: payload.name,
      parentId
    })
    await databaseService.folders.insertOne(folder)
    return folder
  }

  async getFolderContents(accountId: string, query: GetFolderContentsQuery) {
    const ownerId = this.toObjectId(accountId)
    await this.ensureActiveVerifiedAccount(ownerId)

    const folderId = query.folderId ? this.toObjectId(query.folderId) : null
    const currentFolder = folderId ? await this.getOwnedFolder(folderId, ownerId) : null
    const parentFilter = folderId ? ({ parentId: folderId } as Filter<Folder>) : this.getRootFolderFilter()
    const documentFolderFilter = folderId ? ({ folderId } as Filter<Solution>) : this.getRootDocumentFilter()
    const folderFilters: Filter<Folder>[] = [{ ownerId }, this.getNotDeletedFolderFilter(), parentFilter]
    const documentFilters: Filter<Solution>[] = [
      { uploaderId: ownerId },
      this.getNotDeletedDocumentFilter(),
      documentFolderFilter
    ]

    if (query.q) {
      const regex = query.q.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&')
      folderFilters.push({ name: { $regex: regex, $options: 'i' } })
      documentFilters.push({
        $or: [{ title: { $regex: regex, $options: 'i' } }, { fileName: { $regex: regex, $options: 'i' } }]
      })
    }

    const sortBy = query.sortBy || 'createdAt'
    const order = query.order === 'asc' ? 1 : -1
    const folderSortBy = sortBy === 'name' ? 'name' : sortBy
    const documentSortBy = sortBy === 'name' ? 'title' : sortBy
    const [folders, documents, breadcrumbs] = await Promise.all([
      databaseService.folders
        .find({ $and: folderFilters })
        .sort({ [folderSortBy]: order })
        .toArray(),
      databaseService.solutions
        .find({ $and: documentFilters })
        .sort({ [documentSortBy]: order })
        .toArray(),
      currentFolder ? this.getBreadcrumbs(currentFolder, ownerId) : Promise.resolve([])
    ])

    return {
      currentFolder,
      breadcrumbs,
      folders,
      documents
    }
  }

  async getFolderBreadcrumb(accountId: string, folderId: string) {
    const ownerId = this.toObjectId(accountId)
    await this.ensureActiveVerifiedAccount(ownerId)
    const folder = await this.getOwnedFolder(this.toObjectId(folderId), ownerId)
    return this.getBreadcrumbs(folder, ownerId)
  }

  async renameFolder(accountId: string, folderId: string, payload: UpdateFolderReqBody) {
    const ownerId = this.toObjectId(accountId)
    const folderObjectId = this.toObjectId(folderId)
    await this.ensureActiveVerifiedAccount(ownerId)
    await this.getOwnedFolder(folderObjectId, ownerId)

    const updatedFolder = await databaseService.folders.findOneAndUpdate(
      { _id: folderObjectId, ownerId, ...this.getNotDeletedFolderFilter() },
      { $set: { name: payload.name.trim(), updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    if (!updatedFolder) {
      throw new ErrorWithStatus(FOLDER_MESSAGES.FOLDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
    return updatedFolder
  }

  async moveFolder(accountId: string, folderId: string, payload: MoveFolderReqBody) {
    const ownerId = this.toObjectId(accountId)
    const folderObjectId = this.toObjectId(folderId)
    await this.ensureActiveVerifiedAccount(ownerId)
    await this.getOwnedFolder(folderObjectId, ownerId)

    const parentId = payload.parentId ? this.toObjectId(payload.parentId) : null
    if (parentId?.equals(folderObjectId)) {
      throw new ErrorWithStatus(FOLDER_MESSAGES.CANNOT_MOVE_FOLDER_TO_ITSELF, HTTP_STATUS.BAD_REQUEST)
    }
    if (parentId) {
      const parent = await this.ensureParentFolder(parentId, ownerId)
      await this.ensureMoveDoesNotCreateCycle(folderObjectId, parent, ownerId)
    }

    const movedFolder = await databaseService.folders.findOneAndUpdate(
      { _id: folderObjectId, ownerId, ...this.getNotDeletedFolderFilter() },
      { $set: { parentId, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    if (!movedFolder) {
      throw new ErrorWithStatus(FOLDER_MESSAGES.FOLDER_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
    return movedFolder
  }

  async deleteFolder(accountId: string, folderId: string) {
    const ownerId = this.toObjectId(accountId)
    const folderObjectId = this.toObjectId(folderId)
    await this.ensureActiveVerifiedAccount(ownerId)
    await this.getOwnedFolder(folderObjectId, ownerId)

    const folderIds = await this.getSubtreeFolderIds(folderObjectId, ownerId)
    const documents = await databaseService.solutions
      .find({
        uploaderId: ownerId,
        folderId: { $in: folderIds },
        ...this.getNotDeletedDocumentFilter()
      })
      .project<{ _id: ObjectId; fileSizeBytes: number }>({ _id: 1, fileSizeBytes: 1 })
      .toArray()
    const documentIds = documents.map((document) => document._id)
    const releasedBytes = documents.reduce((total, document) => total + document.fileSizeBytes, 0)
    const now = new Date()
    const autoDeleteAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    if (documentIds.length) {
      await databaseService.solutions.updateMany(
        { _id: { $in: documentIds }, uploaderId: ownerId, ...this.getNotDeletedDocumentFilter() },
        {
          $set: {
            status: SolutionStatus.archived,
            deletedAt: now,
            deletedBy: ownerId,
            deleteReason: 'Parent folder cascade deleted',
            autoDeleteAt,
            updatedAt: now
          }
        }
      )

      if (releasedBytes > 0) {
        const quota = await databaseService.storageQuotas.findOne({ accountId: ownerId })
        if (quota) {
          await databaseService.storageQuotas.updateOne(
            { accountId: ownerId },
            { $set: { usedBytes: Math.max(quota.usedBytes - releasedBytes, 0), updatedAt: now } }
          )
        }
      }

      await Promise.all([
        databaseService.favorites.deleteMany({ solutionId: { $in: documentIds } }),
        databaseService.permissionLinks.updateMany(
          { solutionId: { $in: documentIds }, isActive: true },
          { $set: { isActive: false } }
        )
      ])
    }

    const folderDeleteResult = await databaseService.folders.updateMany(
      { _id: { $in: folderIds }, ownerId, ...this.getNotDeletedFolderFilter() },
      { $set: { deletedAt: now, deletedBy: ownerId, updatedAt: now } }
    )

    return {
      rootFolderId: folderObjectId,
      deletedFoldersCount: folderDeleteResult.modifiedCount,
      deletedDocumentsCount: documentIds.length,
      releasedBytes,
      deletedAt: now
    }
  }
}

const folderService = new FolderService()
export default folderService
