import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'

// Load environment variables trước khi import các file khác
dotenv.config()

import databaseService from '~/services/database.service'
import { CloudinaryStorage } from '~/services/storage/cloudinary.storage'

const cloudStorage = new CloudinaryStorage()

const getResourceType = (mimeType: string): 'raw' | 'image' | 'auto' => {
  if (mimeType.startsWith('image/')) {
    return 'image'
  }
  return 'raw'
}

async function runMigration() {
  console.log('--- BẮT ĐẦU MIGRATION FILE LOCAL SANG CLOUDINARY ---')

  // 1. Kết nối MongoDB
  await databaseService.connect()

  // 2. Tìm tất cả các file có storageBucket là 'local'
  const localDocuments = await databaseService.solutions
    .find({
      storageBucket: 'local'
    })
    .toArray()

  console.log(`Tìm thấy ${localDocuments.length} tài liệu cần migrate.`)

  let successCount = 0
  let failCount = 0

  for (const doc of localDocuments) {
    console.log(`\nĐang xử lý tài liệu ID: ${doc._id} (${doc.fileName})...`)

    const filePath = path.isAbsolute(doc.storageKey) ? doc.storageKey : path.resolve(doc.storageKey)

    if (!fs.existsSync(filePath)) {
      console.error(`LỖI: Không tìm thấy file local tại: ${filePath}`)
      failCount++
      continue
    }

    try {
      // 3. Giả lập file Multer
      const mockFile = {
        path: filePath,
        originalname: doc.fileName,
        mimetype: doc.mimeType,
        size: doc.fileSizeBytes
      } as Express.Multer.File

      // 4. Upload lên Cloudinary
      console.log('Đang upload lên Cloudinary...')
      const uploadResult = await cloudStorage.upload(mockFile, {
        folder: 'documents',
        resourceType: getResourceType(doc.mimeType),
        originalName: doc.fileName
      })

      // 5. Cập nhật database Solution
      console.log('Đang cập nhật database...')
      await databaseService.solutions.updateOne(
        { _id: doc._id },
        {
          $set: {
            storageKey: uploadResult.storageKey,
            thumbnailUrl: uploadResult.thumbnailUrl,
            storageProvider: uploadResult.provider,
            storageBucket: uploadResult.storageBucket,
            // publicUrl la URL cua app/share link, khong phai Cloudinary storageKey.
            publicUrl: doc.publicUrl || '',
            updatedAt: new Date()
          }
        }
      )

      // 6. Cập nhật database DocumentExtractionJob (nếu có)
      await databaseService.documentExtractionJobs.updateMany(
        { solutionId: doc._id },
        {
          $set: {
            storageKey: uploadResult.storageKey,
            storageProvider: uploadResult.provider,
            storageBucket: uploadResult.storageBucket,
            updatedAt: new Date()
          }
        }
      )

      // 7. Xóa file local sau khi migrate thành công
      console.log('Xóa file local tạm...')
      await fs.promises.unlink(filePath)

      console.log(`Migrate thành công tài liệu: ${doc.fileName}`)
      successCount++
    } catch (err: unknown) {
      console.error(`Thất bại khi migrate tài liệu: ${doc.fileName}`, err)
      failCount++
    }
  }

  console.log('\n--- KẾT QUẢ MIGRATION ---')
  console.log(`Thành công: ${successCount}`)
  console.log(`Thất bại: ${failCount}`)

  process.exit(failCount > 0 ? 1 : 0)
}

runMigration().catch((err) => {
  console.error('Migration gặp lỗi nghiêm trọng:', err)
  process.exit(1)
})
