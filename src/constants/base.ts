import dotenv from 'dotenv'

dotenv.config()
export const Base = {
  port: 5284
}
export const BASE_URL = process.env.BASE_URL || `http://localhost:${Base.port}`
