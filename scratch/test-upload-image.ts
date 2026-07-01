import dotenv from 'dotenv'
import { v2 as cloudinary } from 'cloudinary'

dotenv.config()

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

async function testUploadImage() {
  const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  
  try {
    console.log('Uploading 1x1 PNG image to Cloudinary...')
    const result = await cloudinary.uploader.upload(base64Image, {
      folder: 'documents',
      resource_type: 'image'
    })
    console.log('Upload success!', result.secure_url)
  } catch (err) {
    console.error('Upload fail:', err)
  }
}

testUploadImage()
