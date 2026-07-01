import path from 'node:path'
import { Readable } from 'node:stream'
import databaseService from '~/services/database.service'
import documentExtractionJobService from '~/services/documentExtractionJob.service'
import extractionService from '~/services/extraction.service'
import { CloudinaryStorage, LocalStorage } from '~/services/storage'
import { EXTRACTION_WORKER_POLL_INTERVAL_MS } from '~/constants/base'
import { ExtractionStatus, StorageProvider } from '~/constants/enum'
import { DocumentExtractionJob } from '~/models/DocumentExtractionJob.schema'

const WORKER_ID = `worker-${process.pid}-${Math.random().toString(36).substring(2, 9)}`
let isRunning = true
const localStorage = new LocalStorage()
const cloudStorage = new CloudinaryStorage()

/**
 * Hàm trì hoãn thực thi (sleep) bọc trong Promise để sử dụng với async/await.
 * @param ms Thời gian trì hoãn (mili giây).
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const isLegacyCloudStorageKey = (storageKey: string) =>
  storageKey.startsWith('https://') ||
  storageKey.startsWith('http://') ||
  storageKey.startsWith('raw:') ||
  storageKey.startsWith('image:') ||
  storageKey.startsWith('video:')

const resolveStorageKeyForWorker = (storageKey: string) => {
  if (storageKey.startsWith('test-memory://')) {
    const uploadRoot = process.env.UPLOAD_ROOT || 'uploads'
    const fileName = storageKey.replace('test-memory://', '')
    return path.resolve(uploadRoot, fileName)
  }

  return storageKey
}

const streamToBuffer = async (stream: NodeJS.ReadableStream): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = []

    stream.on('data', (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })
    stream.on('error', reject)
    stream.on('end', () => resolve(Buffer.concat(chunks)))
  })

const readStorageBuffer = async (job: DocumentExtractionJob) => {
  const { storageKey, storageProvider } = job
  const resolvedStorageKey = resolveStorageKeyForWorker(storageKey)
  const adapter =
    storageProvider === StorageProvider.cloudinary || isLegacyCloudStorageKey(resolvedStorageKey)
      ? cloudStorage
      : localStorage
  const stream = await adapter.getFileStream(resolvedStorageKey)
  return streamToBuffer(stream)
}

const toError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)))

/**
 * Hàm xử lý chính cho một DocumentExtractionJob riêng lẻ.
 * Thực hiện kiểm tra sự tồn tại của tệp tin, trích xuất text và lưu trạng thái kết quả.
 * @param job Đối tượng job trích xuất cần thực hiện.
 */
async function processJob(job: DocumentExtractionJob): Promise<void> {
  const { _id, solutionId, uploaderId, storageKey, fileExtension, mimeType, attempts, maxAttempts } = job
  if (!_id) {
    throw new Error('Extraction job is missing _id')
  }

  console.log(
    `[Worker ${WORKER_ID}] Processing job ${_id} for solution ${solutionId} (Attempt ${attempts}/${maxAttempts})`
  )

  try {
    const buffer = await readStorageBuffer(job)
    const normalizedExtension = fileExtension.startsWith('.') ? fileExtension : `.${fileExtension}`
    const fileName = `document-${solutionId.toString()}${normalizedExtension}`

    // Gia lap Multer file tu storage stream de extraction service doc bang buffer.
    const fakeFile = {
      fieldname: 'file',
      originalname: fileName,
      encoding: '7bit',
      mimetype: mimeType,
      size: buffer.length,
      destination: '',
      filename: fileName,
      path: '',
      buffer,
      stream: Readable.from(buffer)
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
  } catch (error: unknown) {
    const extractionError = toError(error)
    console.error(`[Worker ${WORKER_ID}] Error processing job ${_id}:`, extractionError)
    await documentExtractionJobService.failJob(_id, solutionId, extractionError, uploaderId, attempts, maxAttempts)
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
