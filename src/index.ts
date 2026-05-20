import express from 'express'
import { Base, BASE_URL } from './constants/base'
import swaggerUi from 'swagger-ui-express'
import { swaggerDocs } from './swagger'

const app = express()

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs))

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(Base.port, () => {
  console.log(`Server is running at ${BASE_URL || `http://localhost:${Base.port}`}`)
})
