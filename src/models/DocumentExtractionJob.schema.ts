import { ObjectId } from 'mongodb'
import { ExtractionStatus, StorageProvider } from '~/constants/enum'

/**
 * Interface định nghĩa cấu trúc của một document extraction job trong MongoDB.
 */
export interface DocumentExtractionJobType {
  _id?: ObjectId
  /** ID của Solution liên kết với job này */
  solutionId: ObjectId
  /** ID của người dùng thực hiện tải lên tài liệu */
  uploaderId: ObjectId
  /** Khóa lưu trữ của tệp tin trong hệ thống lưu trữ (ví dụ: đường dẫn file) */
  storageKey: string
  /** Provider lưu trữ file gốc */
  storageProvider?: StorageProvider
  /** Bucket/folder hoặc cloud name tương ứng với provider */
  storageBucket?: string
  /** Đuôi mở rộng của tệp tin (ví dụ: pdf, docx, txt) */
  fileExtension: string
  /** MIME type của tệp tin (ví dụ: application/pdf) */
  mimeType: string
  /** Trạng thái hiện tại của job trích xuất chữ */
  status?: ExtractionStatus
  /** Số lần đã thử thực hiện trích xuất */
  attempts?: number
  /** Số lần thử tối đa cho phép */
  maxAttempts?: number
  /** Thời gian job bị khóa bởi một worker */
  lockedAt?: Date
  /** Tên định danh của worker đang khóa job */
  lockedBy?: string
  /** Thông tin lỗi cuối cùng gặp phải trong quá trình xử lý */
  lastError?: string
  /** Thời gian tạo job */
  createdAt?: Date
  /** Thời gian cập nhật job gần nhất */
  updatedAt?: Date
  /** Thời gian bắt đầu xử lý job */
  startedAt?: Date
  /** Thời gian hoàn thành xử lý job (thành công hoặc thất bại) */
  finishedAt?: Date
}

/**
 * Class đại diện cho một đối tượng DocumentExtractionJob,
 * dùng để khởi tạo và chuẩn hóa dữ liệu trước khi lưu trữ vào database.
 */
export class DocumentExtractionJob implements DocumentExtractionJobType {
  _id?: ObjectId
  solutionId: ObjectId
  uploaderId: ObjectId
  storageKey: string
  storageProvider: StorageProvider
  storageBucket: string
  fileExtension: string
  mimeType: string
  status: ExtractionStatus
  attempts: number
  maxAttempts: number
  lockedAt?: Date
  lockedBy?: string
  lastError?: string
  createdAt: Date
  updatedAt: Date
  startedAt?: Date
  finishedAt?: Date

  /**
   * Khởi tạo một đối tượng DocumentExtractionJob mới.
   * @param job Dữ liệu đầu vào tuân thủ giao diện DocumentExtractionJobType.
   */
  constructor(job: DocumentExtractionJobType) {
    const now = new Date()
    this._id = job._id
    this.solutionId = job.solutionId
    this.uploaderId = job.uploaderId
    this.storageKey = job.storageKey
    this.storageProvider = job.storageProvider || StorageProvider.s3
    this.storageBucket = job.storageBucket || 'local'
    this.fileExtension = job.fileExtension
    this.mimeType = job.mimeType
    this.status = job.status || ExtractionStatus.pending
    this.attempts = job.attempts || 0
    this.maxAttempts = job.maxAttempts || 3
    this.lockedAt = job.lockedAt
    this.lockedBy = job.lockedBy
    this.lastError = job.lastError
    this.createdAt = job.createdAt || now
    this.updatedAt = job.updatedAt || now
    this.startedAt = job.startedAt
    this.finishedAt = job.finishedAt
  }
}
