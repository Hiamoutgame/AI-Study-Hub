import { LocalStorage } from '~/services/storage/local.storage'
import { CloudinaryStorage } from '~/services/storage/cloudinary.storage'
import { StorageProvider } from '~/constants/enum'
import fs from 'node:fs'

// Mock cloudinary
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload: jest.fn(),
      destroy: jest.fn()
    },
    url: jest.fn()
  }
}))

import { v2 as cloudinary } from 'cloudinary'

describe('Storage Adapters', () => {
  describe('LocalStorage', () => {
    let local: LocalStorage
    beforeEach(() => {
      local = new LocalStorage()
    })

    test('upload returns local format', async () => {
      const file = {
        path: 'uploads/test.pdf',
        originalname: 'test.pdf'
      } as Express.Multer.File

      const result = await local.upload(file, {
        folder: 'documents',
        resourceType: 'raw',
        originalName: 'test.pdf'
      })

      expect(result.storageKey).toBe('uploads/test.pdf')
      expect(result.storageBucket).toBe('local')
      expect(result.provider).toBe(StorageProvider.s3)
    })

    test('delete removes file if exists', async () => {
      const existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true)
      const unlinkSpy = jest.spyOn(fs.promises, 'unlink').mockImplementation(() => Promise.resolve())

      await local.delete('uploads/test.pdf')

      expect(existsSyncSpy).toHaveBeenCalled()
      expect(unlinkSpy).toHaveBeenCalled()

      existsSyncSpy.mockRestore()
      unlinkSpy.mockRestore()
    })
  })

  describe('CloudinaryStorage', () => {
    let cloud: CloudinaryStorage
    beforeEach(() => {
      cloud = new CloudinaryStorage()
      jest.clearAllMocks()
    })

    test('upload calls cloudinary.uploader.upload', async () => {
      const file = {
        path: 'uploads/test.pdf',
        originalname: 'test.pdf'
      } as Express.Multer.File

      const mockUploadResult = {
        public_id: 'documents/abc.pdf',
        secure_url: 'https://res.cloudinary.com/cloud/raw/upload/v123/documents/abc.pdf',
        resource_type: 'raw'
      }

      ;(cloudinary.uploader.upload as jest.Mock).mockResolvedValue(mockUploadResult)

      const result = await cloud.upload(file, {
        folder: 'documents',
        resourceType: 'raw',
        originalName: 'test.pdf'
      })

      expect(cloudinary.uploader.upload).toHaveBeenCalledWith('uploads/test.pdf', {
        folder: 'documents',
        resource_type: 'raw',
        use_filename: true,
        unique_filename: true
      })
      expect(result.storageKey).toBe('raw:documents/abc.pdf')
      expect('publicUrl' in result).toBe(false)
      expect(result.provider).toBe(StorageProvider.cloudinary)
    })

    test('delete calls cloudinary.uploader.destroy with encoded storageKey', async () => {
      ;(cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({ result: 'ok' })

      await cloud.delete('raw:documents/abc.pdf')

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('documents/abc.pdf', {
        resource_type: 'raw'
      })
    })

    test('delete still supports legacy Cloudinary secure URLs', async () => {
      ;(cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({ result: 'ok' })

      await cloud.delete('https://res.cloudinary.com/cloud/raw/upload/v123/documents/abc.pdf')

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('documents/abc.pdf', {
        resource_type: 'raw'
      })
    })
  })
})
