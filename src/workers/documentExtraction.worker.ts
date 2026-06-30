import path from 'node:path'
import fs from 'node:fs'
import databaseService from '~/services/database.service'
import documentExtractionJobService from '~/services/documentExtractionJob.service'
import extractionService from '~/services/extraction.service'
import { EXTRACTION_WORKER_POLL_INTERVAL_MS } from '~/constants/base'
import { ExtractionStatus } from '~/constants/enum'

const WORKER_ID = `worker-${process.pid}-${Math.random().toString(36).substring(2, 9)}`
let isRunning = true

/**
 * Hàm trì hoãn thực thi (sleep) bọc trong Promise để sử dụng với async/await.
 * @param ms Thời gian trì hoãn (mili giây).
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Hàm xử lý chính cho một DocumentExtractionJob riêng lẻ.
 * Thực hiện kiểm tra sự tồn tại của tệp tin, trích xuất text và lưu trạng thái kết quả.
 * @param job Đối tượng job trích xuất cần thực hiện.
 */
async function processJob(job: any): Promise<void> {
  const { _id, solutionId, uploaderId, storageKey, mimeType, attempts, maxAttempts } = job
  console.log(
    `[Worker ${WORKER_ID}] Processing job ${_id} for solution ${solutionId} (Attempt ${attempts}/${maxAttempts})`
  )

  try {
    let filePath = storageKey
    // Hỗ trợ xử lý tệp ảo trong môi trường testing (test-memory://)
    if (storageKey.startsWith('test-memory://')) {
      const uploadRoot = process.env.UPLOAD_ROOT || 'uploads'
      const fileName = storageKey.replace('test-memory://', '')
      filePath = path.resolve(uploadRoot, fileName)
    } else if (!path.isAbsolute(storageKey)) {
      filePath = path.resolve(storageKey)
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`)
    }

    // Giả lập cấu trúc tệp tin Multer để truyền vào service trích xuất chữ có sẵn
    const fakeFile = {
      fieldname: 'file',
      originalname: path.basename(filePath),
      encoding: '7bit',
      mimetype: mimeType,
      size: fs.statSync(filePath).size,
      destination: path.dirname(filePath),
      filename: path.basename(filePath),
      path: filePath,
      buffer: undefined as any,
      stream: null as any
    } as Express.Multer.File

    const result = await extractionService.extractText(fakeFile)

    if (result.status === ExtractionStatus.completed) {
      await documentExtractionJobService.completeJob(_id, solutionId, result.text, uploaderId)
      console.log(`[Worker ${WORKER_ID}] Job ${_id} completed successfully`)
    } else if (result.status === ExtractionStatus.skipped) {
      await documentExtractionJobService.skipJob(_id, solutionId, result.errorMessage, uploaderId)
      console.log(`[Worker ${WORKER_ID}] Job ${_id} skipped: ${result.errorMessage}`)
    } else {
      throw new Error(result.errorMessage || 'Extraction failed')
    }
  } catch (error: any) {
    console.error(`[Worker ${WORKER_ID}] Error processing job ${_id}:`, error)
    await documentExtractionJobService.failJob(_id, solutionId, error, uploaderId, attempts, maxAttempts)
  }
}

/**
 * Vòng lặp chính của worker tiến hành polling từ hàng đợi database.
 */
async function startWorker() {
  console.log(`[Worker ${WORKER_ID}] Starting document extraction worker...`)

  try {
    await databaseService.connect()
  } catch (err) {
    console.error(`[Worker ${WORKER_ID}] Failed to connect to database:`, err)
    process.exit(1)
  }

  while (isRunning) {
    try {
      const job = await documentExtractionJobService.claimNextJob(WORKER_ID)
      if (job) {
        await processJob(job)
      } else {
        // Đợi trong giây lát nếu hàng đợi trống
        await sleep(EXTRACTION_WORKER_POLL_INTERVAL_MS)
      }
    } catch (error) {
      console.error(`[Worker ${WORKER_ID}] Worker loop error:`, error)
      await sleep(EXTRACTION_WORKER_POLL_INTERVAL_MS)
    }
  }
}

/**
 * Quy trình đóng tiến trình an toàn khi nhận tín hiệu kết thúc từ hệ thống.
 */
const gracefulShutdown = async () => {
  console.log(`\n[Worker ${WORKER_ID}] SIGINT/SIGTERM received. Shutting down gracefully...`)
  isRunning = false
  try {
    await databaseService.disconnect()
    console.log(`[Worker ${WORKER_ID}] Database disconnected. Goodbye!`)
    process.exit(0)
  } catch (err) {
    console.error(`[Worker ${WORKER_ID}] Error disconnecting database:`, err)
    process.exit(1)
  }
}

process.on('SIGINT', gracefulShutdown)
process.on('SIGTERM', gracefulShutdown)

startWorker()
