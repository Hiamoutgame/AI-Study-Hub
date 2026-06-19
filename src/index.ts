import express from 'express'
import cors from 'cors'
import { Base, BASE_URL, CORS_ORIGINS } from './constants/base'
import swaggerUi from 'swagger-ui-express'
import { swaggerDocs } from './swagger'
import databaseService from './services/database.service'
import accountRouter from './routes/account.route'
import userRouter from './routes/user.route'
import documentRouter from './routes/document.route'
import adminRouter from './routes/admin.route'
import categoryRouter from './routes/category.route'
import sharedRouter from './routes/shared.route'
import folderRouter from './routes/folder.route'
import { defautHandler } from './middlewares/error.middlewares'
databaseService.connect()
const app = express()

app.use(
  cors({
    origin: CORS_ORIGINS.includes('*')
      ? true
      : (origin, callback) => {
          if (!origin || CORS_ORIGINS.includes(origin)) {
            return callback(null, true)
          }

          return callback(new Error('Not allowed by CORS'))
        },
    credentials: true
  })
)
app.use(express.json())
app.use('/uploads', express.static('uploads'))
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs))
app.use('/account', accountRouter)
app.use('/users', userRouter)
app.use('/documents', documentRouter)
app.use('/admin', adminRouter)
app.use('/categories', categoryRouter)
app.use('/shared', sharedRouter)
app.use('/folders', folderRouter)

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.use(defautHandler)

app.listen(Base.port, () => {
  console.log(`Server is running at ${BASE_URL || `http://localhost:${Base.port}`}`)
})
