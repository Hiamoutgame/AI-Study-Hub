import https from 'node:https'

async function checkTime() {
  console.log('--- SYSTEM TIME VS REAL TIME CHECK ---')
  console.log('System Time:', new Date().toISOString())

  https.get('https://worldtimeapi.org/api/timezone/Etc/UTC', (res) => {
    let data = ''
    res.on('data', (chunk) => {
      data += chunk
    })
    res.on('end', () => {
      try {
        const json = JSON.parse(data)
        console.log('Real UTC Time:', json.datetime)
        const sysTime = Date.now()
        const realTime = Date.parse(json.datetime)
        const diffMs = sysTime - realTime
        console.log(`Difference: ${diffMs} ms (~${(diffMs / 1000 / 60 / 60 / 24).toFixed(1)} days)`)
      } catch (e: any) {
        console.error('Failed to parse time API response:', e.message)
      }
    })
  }).on('error', (err) => {
    console.error('Network request failed:', err.message)
  })
}

checkTime()
