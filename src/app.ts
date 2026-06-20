import cors from 'cors'
import express from 'express'
import swaggerUi from 'swagger-ui-express'
import { CORS_ORIGINS, UPLOAD_ROOT } from './constants/base'
import { defautHandler } from './middlewares/error.middlewares'
import accountRouter from './routes/account.route'
import adminRouter from './routes/admin.route'
import categoryRouter from './routes/category.route'
import documentRouter from './routes/document.route'
import folderRouter from './routes/folder.route'
import sharedRouter from './routes/shared.route'
import userRouter from './routes/user.route'
import { swaggerDocs } from './swagger'

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
app.use('/uploads', express.static(UPLOAD_ROOT))
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs))
app.use('/account', accountRouter)
app.use('/users', userRouter)
app.use('/documents', documentRouter)
app.use('/admin', adminRouter)
app.use('/categories', categoryRouter)
app.use('/shared', sharedRouter)
app.use('/folders', folderRouter)

app.get('/', (_req, res) => {
  res.send('Hello World!')
})

app.use(defautHandler)

export default app
