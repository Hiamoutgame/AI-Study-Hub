import dotenv from 'dotenv'
import { v2 as cloudinary } from 'cloudinary'

dotenv.config()

const cloud_name = process.env.CLOUDINARY_CLOUD_NAME
const api_key = process.env.CLOUDINARY_API_KEY
const api_secret = process.env.CLOUDINARY_API_SECRET

console.log('--- CLOUDINARY CONFIG DEBUG ---')
console.log(`CLOUD_NAME: "${cloud_name}"`)
console.log(`API_KEY: "${api_key}"`)
console.log(`API_SECRET length: ${api_secret ? api_secret.length : 0}`)

cloudinary.config({
  cloud_name,
  api_key,
  api_secret
})

async function testCloudinary() {
  try {
    console.log('Calling cloudinary.api.ping()...')
    const pingResult = await cloudinary.api.ping()
    console.log('Ping result:', pingResult)
  } catch (err: any) {
    console.error('Ping failed:', err)
  }
}

testCloudinary()
