import fs from 'node:fs'
import path from 'node:path'
import { StorageAdapter, UploadOptions, UploadResult } from './storage.interface'
import { StorageProvider } from '~/constants/enum'

/**
 * LocalStorage implements StorageAdapter.
 * Giữ file lưu trên disk cục bộ của VPS hoặc môi trường dev.
 */
export class LocalStorage implements StorageAdapter {
  /**
   * Upload file cục bộ
   * Do Multer đã lưu file xuống disk từ trước nên ở đây chỉ cần lấy thông tin file.
   */
  async upload(file: Express.Multer.File, options: UploadOptions): Promise<UploadResult> {
    const storageKey = file.path
      ? file.path.replace(/\\/g, '/')
      : `uploads/${options.folder}/${Date.now()}-${options.originalName}`
    return {
      storageKey,
      thumbnailUrl: '',
      storageBucket: 'local',
      provider: StorageProvider.s3
    }
  }

  /**
   * Xóa file cục bộ trên disk
   */
  async delete(storageKey: string): Promise<void> {
    const filePath = path.isAbsolute(storageKey) ? storageKey : path.resolve(storageKey)
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath)
    }
  }

  /**
   * Lấy URL download (local không hỗ trợ URL trực tiếp)
   */
  async getDownloadUrl(storageKey: string): Promise<string> {
    return ''
  }

  /**
   * Đọc file stream từ disk
   */
  async getFileStream(storageKey: string): Promise<NodeJS.ReadableStream> {
    const filePath = path.isAbsolute(storageKey) ? storageKey : path.resolve(storageKey)
    if (!fs.existsSync(filePath)) {
      throw new Error(`File local không tồn tại: ${storageKey}`)
    }
    return fs.createReadStream(filePath)
  }
}
