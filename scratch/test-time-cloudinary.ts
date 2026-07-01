import https from 'node:https'
import { v2 as cloudinary } from 'cloudinary'
import dotenv from 'dotenv'

dotenv.config()

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

https.get('https://api.cloudinary.com/v1_1/ping', (res) => {
  console.log('Date from Cloudinary server:', res.headers.date)
  
  const serverTime = new Date(res.headers.date as string).getTime()
  const localTime = Date.now()
  console.log('Server time (ms):', serverTime)
  console.log('Local time (ms):', localTime)
  
  const diff = serverTime - localTime
  console.log('Difference (ms):', diff)
  
  const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  
  // Try uploading with corrected timestamp
  const correctedTimestamp = Math.round(serverTime / 1000)
  console.log('Trying upload with corrected timestamp:', correctedTimestamp)
  
  cloudinary.uploader.upload(base64Image, {
    folder: 'documents',
    resource_type: 'image',
    timestamp: correctedTimestamp
  }).then(result => {
    console.log('UPLOAD SUCCESS!', result.secure_url)
  }).catch(err => {
    console.error('UPLOAD FAIL:', err)
  })
}).on('error', err => {
  console.error('Network err:', err)
})
