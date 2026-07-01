import crypto from 'crypto'

async function uploadToCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dkldmjuk4'
  const apiKey = process.env.CLOUDINARY_API_KEY || '238849795435593'
  const apiSecret = process.env.CLOUDINARY_API_SECRET || 'eFO5X1KFxZ0dVDjLWDihsavY8nw'
  
  const timestamp = Math.round(Date.now() / 1000).toString()
  
  // Construct signature
  const paramsToSign = `timestamp=${timestamp}`
  const signature = crypto.createHash('sha1').update(paramsToSign + apiSecret).digest('hex')
  
  const formData = new FormData()
  formData.append('file', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
  formData.append('api_key', apiKey)
  formData.append('timestamp', timestamp)
  formData.append('signature', signature)
  
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
  
  console.log('Sending direct request to:', url)
  try {
    const res = await fetch(url, {
      method: 'POST',
      body: formData
    })
    
    const data = await res.json()
    console.log('Status:', res.status)
    console.log('Response body:', data)
  } catch (err: any) {
    console.error('Fetch error:', err.message)
  }
}

uploadToCloudinary()
