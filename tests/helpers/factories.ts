import { ObjectId } from 'mongodb'
import { PermissionLevel, StorageProvider, UserRole } from '~/constants/enum'
import { Account, AccountType } from '~/models/Account.schema'
import { Folder, FolderType } from '~/models/Folder.schema'
import { PermissionLink } from '~/models/PermissionLink.schema'
import { Solution } from '~/models/Solution.schema'
import { hashPassword } from '~/utils/crypto'

let sequence = 0

const nextSuffix = () => `${Date.now()}-${++sequence}`

export const createRegisterBody = (
  overrides: Partial<Record<'username' | 'email' | 'password' | 'fullName', string>> = {}
) => {
  const suffix = nextSuffix()
  return {
    username: `student-${suffix}`,
    email: `student-${suffix}@example.com`,
    password: 'Test@12345',
    fullName: 'Test Student',
    ...overrides
  }
}

export const createAccount = (overrides: Partial<AccountType> = {}) => {
  const suffix = nextSuffix()
  return new Account({
    _id: new ObjectId(),
    email: `account-${suffix}@example.com`,
    passwordHash: hashPassword('Test@12345'),
    fullName: 'Test Account',
    username: `account-${suffix}`,
    role: UserRole.user,
    isActive: true,
    isEmailVerified: true,
    ...overrides
  })
}

export const createFolder = (ownerId: ObjectId, overrides: Partial<FolderType> = {}) =>
  new Folder({
    _id: new ObjectId(),
    ownerId,
    name: `Folder ${nextSuffix()}`,
    parentId: null,
    ...overrides
  })

export const createSolution = (
  uploaderId: ObjectId,
  overrides: Partial<ConstructorParameters<typeof Solution>[0]> = {}
) =>
  new Solution({
    _id: new ObjectId(),
    uploaderId,
    title: `Document ${nextSuffix()}`,
    fileName: 'fixture.txt',
    fileExtension: '.txt',
    fileSizeBytes: 12,
    mimeType: 'text/plain',
    storageProvider: StorageProvider.s3,
    storageBucket: 'local',
    storageKey: '.test-data/uploads/documents/fixture.txt',
    isPublic: false,
    ...overrides
  })

export const createPermissionLink = (
  solutionId: ObjectId,
  createdBy: ObjectId,
  overrides: Partial<ConstructorParameters<typeof PermissionLink>[0]> = {}
) =>
  new PermissionLink({
    _id: new ObjectId(),
    solutionId,
    createdBy,
    token: `share-${nextSuffix()}`,
    permissionLevel: PermissionLevel.viewer,
    isActive: true,
    ...overrides
  })
