import express from 'express'
import { Base, BASE_URL } from './constants/base'

const app = express()
app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(Base.port, () => {
  console.log(`Server is running at ${BASE_URL || `http://localhost:${Base.port}`}`)
})
