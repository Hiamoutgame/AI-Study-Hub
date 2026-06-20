import fs from 'node:fs/promises'
import path from 'node:path'
import { AccountType } from '~/models/Account.schema'
import { FolderType } from '~/models/Folder.schema'
import databaseService from '~/services/database.service'
import { DB_NAME, DATABASE_URL, UPLOAD_ROOT } from '~/constants/base'
import { createAccount, createFolder, createPermissionLink, createSolution } from './factories'

const testCollections = () => [
  databaseService.accounts,
  databaseService.storageQuotas,
  databaseService.activityLogs,
  databaseService.solutions,
  databaseService.folders,
  databaseService.solutionCategories,
  databaseService.aiChatSessions,
  databaseService.aiMessages,
  databaseService.documentEmbeddings,
  databaseService.aiConfigurations,
  databaseService.permissionLinks,
  databaseService.favorites,
  databaseService.notifications
]

const assertSafeTestDatabase = () => {
  const isLocalMongo = /^mongodb:\/\/(127\.0\.0\.1|localhost|\[::1\])(?::|\/)/i.test(DATABASE_URL)
  if (!isLocalMongo) {
    throw new Error(`Integration tests only allow a local MongoDB URL. Received: ${DATABASE_URL}`)
  }

  if (!DB_NAME.endsWith('_test')) {
    throw new Error(`Integration test database name must end with "_test". Received: ${DB_NAME}`)
  }
}

export const connectTestDatabase = async () => {
  assertSafeTestDatabase()
  await databaseService.connect()
}

export const clearTestDatabase = async () => {
  assertSafeTestDatabase()
  await Promise.all(testCollections().map((collection) => collection.deleteMany({})))
}

export const disconnectTestDatabase = () => databaseService.disconnect()

export const cleanupTestUploads = async () => {
  const uploadPath = path.resolve(UPLOAD_ROOT)
  const workspacePath = path.resolve(process.cwd())
  const relativePath = path.relative(workspacePath, uploadPath)

  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`Refusing to clean test uploads outside the workspace: ${uploadPath}`)
  }

  await fs.rm(uploadPath, { recursive: true, force: true })
}

export const seedAccount = async (overrides: Partial<AccountType> = {}) => {
  const account = createAccount(overrides)
  await databaseService.accounts.insertOne(account)
  return account
}

export const seedFolder = async (ownerId: Parameters<typeof createFolder>[0], overrides: Partial<FolderType> = {}) => {
  const folder = createFolder(ownerId, overrides)
  await databaseService.folders.insertOne(folder)
  return folder
}

export const seedDocument = async (
  uploaderId: Parameters<typeof createSolution>[0],
  overrides: Parameters<typeof createSolution>[1] = {}
) => {
  const document = createSolution(uploaderId, overrides)
  await databaseService.solutions.insertOne(document)
  return document
}

export const seedPermissionLink = async (
  solutionId: Parameters<typeof createPermissionLink>[0],
  createdBy: Parameters<typeof createPermissionLink>[1],
  overrides: Parameters<typeof createPermissionLink>[2] = {}
) => {
  const permissionLink = createPermissionLink(solutionId, createdBy, overrides)
  await databaseService.permissionLinks.insertOne(permissionLink)
  return permissionLink
}
