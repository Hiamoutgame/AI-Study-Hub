import app from './app'
import { Base, BASE_URL } from './constants/base'
import databaseService from './services/database.service'

const bootstrap = async () => {
  await databaseService.connect()
  app.listen(Base.port, () => {
    console.log(`Server is running at ${BASE_URL || `http://localhost:${Base.port}`}`)
  })
}

void bootstrap()
