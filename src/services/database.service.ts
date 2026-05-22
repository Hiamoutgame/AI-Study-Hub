import { Collection, Db, MongoClient, ServerApiVersion } from 'mongodb'
import { DATABASE_URL, DB_NAME } from '~/constants/base'

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
class DatabaseService {
  private client: MongoClient
  private dbName: Db
  constructor() {
    this.client = new MongoClient(DATABASE_URL)
    this.dbName = this.client.db(DB_NAME)
  }
  async connect() {
    try {
      await this.dbName.command({ ping: 1 })
      console.log('You successfully connected to MongoDB!')
    } catch (error) {
      console.error('Error connecting to MongoDB:', error)
      throw error
    }
  }
  get account(): Collection<Account> {
    return this.dbName.collection('account')
  }
}

const databaseService = new DatabaseService()
export default databaseService
