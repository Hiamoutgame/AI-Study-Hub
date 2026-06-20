import { ObjectId } from 'mongodb'
import { AiStatus, ExtractionStatus, SolutionStatus, StorageProvider } from '~/constants/enum'

interface SolutionType {
  _id?: ObjectId
  uploaderId: ObjectId
  categoryId?: ObjectId
  folderId?: ObjectId | null
  title: string
  description?: string
  tags?: string[]
  fileName: string
  fileExtension: string
  fileSizeBytes: number
  mimeType: string
  storageProvider?: StorageProvider
  storageBucket: string
  storageKey: string
  publicUrl?: string
  thumbnailUrl?: string
  status?: SolutionStatus
  isPublic?: boolean
  viewCount?: number
  downloadCount?: number
  language?: string
  pageCount?: number
  checksum?: string
  aiStatus?: AiStatus
  aiErrorMessage?: string
  extractionStatus?: ExtractionStatus
  extractedText?: string
  extractedAt?: Date
  extractionErrorMessage?: string
  flagCount?: number
  flaggedAt?: Date
  flaggedBy?: ObjectId
  flagReason?: string
  flagCategory?: string
  deletedAt?: Date
  deletedBy?: ObjectId
  deleteReason?: string
  autoDeleteAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

export class Solution implements SolutionType {
  _id?: ObjectId
  uploaderId: ObjectId
  categoryId?: ObjectId
  folderId?: ObjectId | null
  title: string
  description: string
  tags: string[]
  fileName: string
  fileExtension: string
  fileSizeBytes: number
  mimeType: string
  storageProvider: StorageProvider
  storageBucket: string
  storageKey: string
  publicUrl: string
  thumbnailUrl: string
  status: SolutionStatus
  isPublic: boolean
  viewCount: number
  downloadCount: number
  language: string
  pageCount: number
  checksum: string
  aiStatus: AiStatus
  aiErrorMessage: string
  extractionStatus: ExtractionStatus
  extractedText: string
  extractedAt?: Date
  extractionErrorMessage: string
  flagCount: number
  flaggedAt?: Date
  flaggedBy?: ObjectId
  flagReason: string
  flagCategory: string
  deletedAt?: Date
  deletedBy?: ObjectId
  deleteReason: string
  autoDeleteAt?: Date
  createdAt: Date
  updatedAt: Date

  constructor(solution: SolutionType) {
    const now = new Date()
    this._id = solution._id
    this.uploaderId = solution.uploaderId
    this.categoryId = solution.categoryId
    this.folderId = solution.folderId ?? null
    this.title = solution.title
    this.description = solution.description || ''
    this.tags = solution.tags || []
    this.fileName = solution.fileName
    this.fileExtension = solution.fileExtension
    this.fileSizeBytes = solution.fileSizeBytes
    this.mimeType = solution.mimeType
    this.storageProvider = solution.storageProvider || StorageProvider.s3
    this.storageBucket = solution.storageBucket
    this.storageKey = solution.storageKey
    this.publicUrl = solution.publicUrl || ''
    this.thumbnailUrl = solution.thumbnailUrl || ''
    this.status = solution.status || SolutionStatus.active
    this.isPublic = solution.isPublic || false
    this.viewCount = solution.viewCount || 0
    this.downloadCount = solution.downloadCount || 0
    this.language = solution.language || 'vi'
    this.pageCount = solution.pageCount || 0
    this.checksum = solution.checksum || ''
    this.aiStatus = solution.aiStatus || AiStatus.pending
    this.aiErrorMessage = solution.aiErrorMessage || ''
    this.extractionStatus = solution.extractionStatus || ExtractionStatus.pending
    this.extractedText = solution.extractedText || ''
    this.extractedAt = solution.extractedAt
    this.extractionErrorMessage = solution.extractionErrorMessage || ''
    this.flagCount = solution.flagCount || 0
    this.flaggedAt = solution.flaggedAt
    this.flaggedBy = solution.flaggedBy
    this.flagReason = solution.flagReason || ''
    this.flagCategory = solution.flagCategory || ''
    this.deletedAt = solution.deletedAt
    this.deletedBy = solution.deletedBy
    this.deleteReason = solution.deleteReason || ''
    this.autoDeleteAt = solution.autoDeleteAt
    this.createdAt = solution.createdAt || now
    this.updatedAt = solution.updatedAt || now
  }
}
