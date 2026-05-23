import dotenv from 'dotenv'

dotenv.config()
export const Base = {
  port: 5284
}
export const BASE_URL = process.env.BASE_URL || (`http://localhost:${Base.port}` as string)
export const DATABASE_URL =
  // `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.8rbfzkl.mongodb.net/?appName=Cluster0` as string
  `mongodb+srv://anhvietanh1123_db_user:lamll012@cluster0.8rbfzkl.mongodb.net/?appName=Cluster0`
export const DB_NAME = process.env.DB_NAME as string
export const DNS_SERVERS = process.env.DNS_SERVERS as string
