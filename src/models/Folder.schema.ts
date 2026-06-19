import { ObjectId } from 'mongodb'

export interface FolderType {
  _id?: ObjectId
  ownerId: ObjectId
  name: string
  parentId?: ObjectId | null
  deletedAt?: Date
  deletedBy?: ObjectId
  createdAt?: Date
  updatedAt?: Date
}

export class Folder implements FolderType {
  _id?: ObjectId
  ownerId: ObjectId
  name: string
  parentId: ObjectId | null
  deletedAt?: Date
  deletedBy?: ObjectId
  createdAt: Date
  updatedAt: Date

  constructor(folder: FolderType) {
    const now = new Date()
    this._id = folder._id
    this.ownerId = folder.ownerId
    this.name = folder.name.trim()
    this.parentId = folder.parentId ?? null
    this.deletedAt = folder.deletedAt
    this.deletedBy = folder.deletedBy
    this.createdAt = folder.createdAt || now
    this.updatedAt = folder.updatedAt || now
  }
}
