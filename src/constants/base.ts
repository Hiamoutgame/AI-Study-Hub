import dotenv from 'dotenv'

dotenv.config()
export const Base = {
  port: 5284
}
export const BASE_URL = process.env.BASE_URL || (`http://localhost:${Base.port}` as string)
export const DATABASE_URL =
  `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.8rbfzkl.mongodb.net/?appName=Cluster0` as string
export const DB_NAME = process.env.DB_NAME as string
export const DNS_SERVERS = process.env.DNS_SERVERS as string
export const CORS_ORIGINS = (process.env.CORS_ORIGINS as string)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

// Cấu hình SMTP để gửi email (OTP). Để trống khi dev sẽ fallback log OTP ra console.
export const SMTP_HOST = process.env.SMTP_HOST as string
export const SMTP_PORT = Number(process.env.SMTP_PORT) || 587
export const SMTP_USER = process.env.SMTP_USER as string
export const SMTP_PASS = process.env.SMTP_PASS as string
export const EMAIL_FROM = (process.env.EMAIL_FROM || process.env.SMTP_USER) as string
