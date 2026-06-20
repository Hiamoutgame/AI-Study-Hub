import dns from 'node:dns'
import { Collection, Db, MongoClient } from 'mongodb'
import { DATABASE_URL, DB_NAME, DNS_SERVERS } from '~/constants/base'
import { Account } from '~/models/Account.schema'
import { ActivityLog } from '~/models/ActivityLog.schema'
import { AiChatSession } from '~/models/AiChatSession.schema'
import { AiConfiguration } from '~/models/AiConfiguration.schema'
import { AiMessage } from '~/models/AiMessage.schema'
import { DocumentEmbedding } from '~/models/DocumentEmbedding.schema'
import { Favorite } from '~/models/Favorite.schema'
import { Folder } from '~/models/Folder.schema'
import { Notification } from '~/models/Notification.schema'
import { PermissionLink } from '~/models/PermissionLink.schema'
import { Solution } from '~/models/Solution.schema'
import { SolutionCategory } from '~/models/SolutionCategory.schema'
import { StorageQuota } from '~/models/StorageQuota.schema'

if (DNS_SERVERS.length) {
  dns.setServers(DNS_SERVERS)
}

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
      await this.createIndexes()
      console.log('You successfully connected to MongoDB!')
    } catch (error) {
      console.log('DATABASE_URL', DATABASE_URL)
      console.error('Error connecting to MongoDB:', error)
      throw error
    }
  }

  async disconnect() {
    await this.client.close()
  }

  private async createIndexes() {
    await Promise.all([
      this.favorites.createIndex({ accountId: 1, solutionId: 1 }, { unique: true }),
      this.permissionLinks.createIndex({ token: 1 }, { unique: true }),
      this.folders.createIndex({ ownerId: 1, parentId: 1, createdAt: -1 }),
      this.folders.createIndex({ ownerId: 1, parentId: 1, name: 1 }),
      this.solutions.createIndex({ uploaderId: 1, folderId: 1, createdAt: -1 })
    ])
  }

  get accounts(): Collection<Account> {
    return this.dbName.collection('accounts')
  }

  get storageQuotas(): Collection<StorageQuota> {
    return this.dbName.collection('storage_quotas')
  }

  get activityLogs(): Collection<ActivityLog> {
    return this.dbName.collection('activity_logs')
  }

  get solutions(): Collection<Solution> {
    return this.dbName.collection('solutions')
  }

  get folders(): Collection<Folder> {
    return this.dbName.collection('folders')
  }

  get solutionCategories(): Collection<SolutionCategory> {
    return this.dbName.collection('solution_categories')
  }

  get aiChatSessions(): Collection<AiChatSession> {
    return this.dbName.collection('ai_chat_sessions')
  }

  get aiMessages(): Collection<AiMessage> {
    return this.dbName.collection('ai_messages')
  }

  get documentEmbeddings(): Collection<DocumentEmbedding> {
    return this.dbName.collection('document_embeddings')
  }

  get aiConfigurations(): Collection<AiConfiguration> {
    return this.dbName.collection('ai_configurations')
  }

  get permissionLinks(): Collection<PermissionLink> {
    return this.dbName.collection('permission_links')
  }

  get favorites(): Collection<Favorite> {
    return this.dbName.collection('favorites')
  }

  get notifications(): Collection<Notification> {
    return this.dbName.collection('notifications')
  }
}

const databaseService = new DatabaseService()
export default databaseService
