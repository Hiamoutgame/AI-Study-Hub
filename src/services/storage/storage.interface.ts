import { StorageProvider } from '~/constants/enum'

export interface UploadResult {
  storageKey: string // Internal storage locator; Cloudinary uses resourceType:publicId
  thumbnailUrl: string // URL thumbnail (nếu có)
  storageBucket: string // bucket/folder name
  provider: StorageProvider
}

export interface UploadOptions {
  folder: string // subfolder trong cloud, ví dụ 'documents' | 'avatars'
  resourceType: 'raw' | 'image' | 'auto'
  originalName: string
}

export interface StorageAdapter {
  upload(file: Express.Multer.File, options: UploadOptions): Promise<UploadResult>
  delete(storageKey: string): Promise<void>
  getDownloadUrl(storageKey: string): Promise<string>
  getFileStream(storageKey: string): Promise<NodeJS.ReadableStream>
}
