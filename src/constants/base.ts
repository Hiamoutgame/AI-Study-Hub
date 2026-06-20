import dotenv from 'dotenv'

dotenv.config({ quiet: true })

export const Base = {
  port: 5284
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
