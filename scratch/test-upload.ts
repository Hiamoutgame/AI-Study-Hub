import dotenv from 'dotenv'
import fs from 'fs'
import { v2 as cloudinary } from 'cloudinary'

dotenv.config()

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

async function testUpload() {
  const testFile = 'scratch/test-upload.txt'
  fs.writeFileSync(testFile, 'Hello Cloudinary')
  
  try {
    console.log('Uploading to cloudinary...')
    const result = await cloudinary.uploader.upload(testFile, {
      folder: 'documents',
      resource_type: 'raw',
      use_filename: true,
      unique_filename: true
    })
    console.log('Upload success!', result.secure_url)
  } catch (err) {
    console.error('Upload fail:', err)
  }
}

testUpload()
