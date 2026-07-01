import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

import databaseService from '~/services/database.service'
import { CloudinaryStorage } from '~/services/storage/cloudinary.storage'
import { LocalStorage } from '~/services/storage/local.storage'
import { StorageProvider } from '~/constants/enum'

const cloudStorage = new CloudinaryStorage()
const localStorage = new LocalStorage()

const isCloudFile = (document: { storageProvider?: StorageProvider; storageKey: string }): boolean => {
  return (
    document.storageProvider === StorageProvider.cloudinary ||
    document.storageKey.startsWith('https://') ||
    document.storageKey.startsWith('http://')
  )
}

async function runCleanup() {
  console.log('--- BẮT ĐẦU CLEANUP TÀI LIỆU ĐÃ HẾT HẠN (HARD DELETE) ---')

  await databaseService.connect()

  const now = new Date()

  // Tìm các tài liệu đã bị soft delete và quá hạn autoDeleteAt
  const expiredDocuments = await databaseService.solutions
    .find({
      autoDeleteAt: { $lt: now }
    })
    .toArray()

  console.log(`Tìm thấy ${expiredDocuments.length} tài liệu cần xóa vĩnh viễn.`)

  let successCount = 0
  let failCount = 0

  for (const doc of expiredDocuments) {
    console.log(`\nĐang xóa vĩnh viễn tài liệu ID: ${doc._id} (${doc.fileName})...`)

    try {
      // 1. Xóa file khỏi storage (Local hoặc Cloud)
      if (doc.storageKey) {
        if (isCloudFile(doc)) {
          console.log(`Xóa file từ Cloudinary...`)
          // Ignore error if file doesn't exist on cloud
          await cloudStorage.delete(doc.storageKey).catch((e) => console.log('File không còn trên Cloudinary:', e.message))
        } else {
          console.log(`Xóa file từ Local disk...`)
          await localStorage.delete(doc.storageKey).catch((e) => console.log('File không còn trên disk:', e.message))
        }
      }

      // 2. Xóa các job trích xuất liên quan
      await databaseService.documentExtractionJobs.deleteMany({ solutionId: doc._id })

      // 3. Xóa các bookmark liên quan
      await databaseService.favorites.deleteMany({ solutionId: doc._id })

      // 4. Xóa permission links liên quan
      await databaseService.permissionLinks.deleteMany({ solutionId: doc._id })

      // 5. Xóa khỏi database solutions
      await databaseService.solutions.deleteOne({ _id: doc._id })

      console.log(`Đã xóa vĩnh viễn thành công tài liệu: ${doc.fileName}`)
      successCount++
    } catch (err: unknown) {
      console.error(`Lỗi khi xóa tài liệu: ${doc.fileName}`, err)
      failCount++
    }
  }

  console.log('\n--- KẾT QUẢ CLEANUP ---')
  console.log(`Thành công: ${successCount}`)
  console.log(`Thất bại: ${failCount}`)

  process.exit(failCount > 0 ? 1 : 0)
}

runCleanup().catch((err) => {
  console.error('Cleanup gặp lỗi nghiêm trọng:', err)
  process.exit(1)
})
