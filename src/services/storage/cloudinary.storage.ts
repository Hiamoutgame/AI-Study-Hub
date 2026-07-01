import https from 'node:https'
import { v2 as cloudinary } from 'cloudinary'
import { StorageAdapter, UploadOptions, UploadResult } from './storage.interface'
import { StorageProvider } from '~/constants/enum'
import { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME } from '~/constants/base'

// Config Cloudinary globally
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET
})

/**
 * CloudinaryStorage implements StorageAdapter.
 * Upload, delete, retrieve files qua Cloudinary API.
 */
export class CloudinaryStorage implements StorageAdapter {
  /**
   * Helper function parse storageKey (format: resourceType:publicId)
   */
  private parseStorageKey(storageKey: string): { resourceType: string; publicId: string } {
    if (storageKey.startsWith('https://') || storageKey.startsWith('http://')) {
      const match = storageKey.match(/res\.cloudinary\.com\/[^/]+\/([^/]+)\/upload\/(?:v\d+\/)?(.+)$/)
      if (!match) {
        throw new Error(`Định dạng URL Cloudinary không hợp lệ: ${storageKey}`)
      }

      const resourceType = match[1]
      const pathWithExt = match[2]
      if (resourceType === 'raw') {
        return { resourceType, publicId: pathWithExt }
      }

      const lastDot = pathWithExt.lastIndexOf('.')
      return {
        resourceType,
        publicId: lastDot === -1 ? pathWithExt : pathWithExt.substring(0, lastDot)
      }
    }

    const separatorIndex = storageKey.indexOf(':')
    if (separatorIndex === -1) {
      return { resourceType: 'image', publicId: storageKey }
    }
    return {
      resourceType: storageKey.substring(0, separatorIndex),
      publicId: storageKey.substring(separatorIndex + 1)
    }
  }

  /**
   * Upload file lên Cloudinary
   * Sử dụng file.path đã được Multer ghi xuống disk local
   */
  async upload(file: Express.Multer.File, options: UploadOptions): Promise<UploadResult> {
    if (!file.path) {
      throw new Error('CloudinaryStorage requires file.path to upload.')
    }

    // cloudinary resource_type only accepts 'image', 'video', 'raw', 'auto'
    const resourceType = options.resourceType === 'raw' ? 'raw' : options.resourceType === 'image' ? 'image' : 'auto'

    const result = await cloudinary.uploader.upload(file.path, {
      folder: options.folder,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true
    })

    // Create thumbnail url for images
    let thumbnailUrl = ''
    if (result.resource_type === 'image') {
      thumbnailUrl = cloudinary.url(result.public_id, {
        width: 200,
        height: 200,
        crop: 'thumb',
        secure: true
      })
    }

    return {
      // Encode resource_type and public_id to make delete/fetch easier
      storageKey: `${result.resource_type}:${result.public_id}`,
      // publicUrl: result.secure_url,
      thumbnailUrl,
      storageBucket: CLOUDINARY_CLOUD_NAME,
      provider: StorageProvider.cloudinary
    }
  }

  /**
   * Xóa file trên Cloudinary
   */
  async delete(storageKey: string): Promise<void> {
    const { resourceType, publicId } = this.parseStorageKey(storageKey)
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
  }

  /**
   * Trả về URL download an toàn của file
   */
  async getDownloadUrl(storageKey: string): Promise<string> {
    if (storageKey.startsWith('https://') || storageKey.startsWith('http://')) {
      return storageKey
    }

    const { resourceType, publicId } = this.parseStorageKey(storageKey)
    return cloudinary.url(publicId, { resource_type: resourceType, secure: true })
  }

  /**
   * Lấy Node Stream của file từ Cloudinary
   * Dùng https.get public URL
   */
  async getFileStream(storageKey: string): Promise<NodeJS.ReadableStream> {
    const url = await this.getDownloadUrl(storageKey)

    return new Promise((resolve, reject) => {
      https
        .get(url, (res) => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res)
          } else {
            reject(new Error(`Fetch stream fail từ Cloudinary: ${res.statusCode} ${res.statusMessage}`))
          }
        })
        .on('error', reject)
    })
  }
}
