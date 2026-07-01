import dotenv from 'dotenv'

dotenv.config({ quiet: true })

export const Base = {
  port: 5285
}

export const BASE_URL = process.env.BASE_URL || `http://localhost:${Base.port}`

const ATLAS_DATABASE_URL =
  process.env.DB_USERNAME && process.env.DB_PASSWORD
    ? `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.8rbfzkl.mongodb.net/?appName=Cluster0`
    : 'mongodb://127.0.0.1:27017'

export const DATABASE_URL = process.env.DATABASE_URL || ATLAS_DATABASE_URL
export const DB_NAME = process.env.DB_NAME || 'ai_study_hub'
export const DNS_SERVERS = (process.env.DNS_SERVERS || '')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean)
export const CORS_ORIGINS = (process.env.CORS_ORIGINS || '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
export const UPLOAD_ROOT = process.env.UPLOAD_ROOT || 'uploads'

// Cau hinh SMTP de gui email OTP. De trong khi dev se fallback log OTP ra console.
export const SMTP_HOST = process.env.SMTP_HOST as string
export const SMTP_PORT = Number(process.env.SMTP_PORT) || 587
export const SMTP_USER = process.env.SMTP_USER as string
export const SMTP_PASS = process.env.SMTP_PASS as string
export const EMAIL_FROM = (process.env.EMAIL_FROM || process.env.SMTP_USER) as string

// Cau hinh cho Async Extraction & OCR Worker
export const EXTRACTION_WORKER_ENABLED = process.env.EXTRACTION_WORKER_ENABLED as boolean | string

//giới hạn số lần retry
export const EXTRACTION_JOB_MAX_ATTEMPTS = Number(process.env.EXTRACTION_JOB_MAX_ATTEMPTS)

//job processing quá lâu có thể reset lại.
export const EXTRACTION_JOB_LOCK_TTL_MS = Number(process.env.EXTRACTION_JOB_LOCK_TTL_MS)

//worker kiểm tra job mỗi 5 giây
export const EXTRACTION_WORKER_POLL_INTERVAL_MS = Number(process.env.EXTRACTION_WORKER_POLL_INTERVAL_MS)

//Cấu hình Cloudinary
export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME as string
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY as string
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET as string
export const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'local'

export const CLOUDINARY_URL =
  `cloudinary://${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}@${CLOUDINARY_CLOUD_NAME}` as string
