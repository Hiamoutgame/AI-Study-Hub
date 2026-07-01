import { STORAGE_PROVIDER } from '~/constants/base'
import { LocalStorage } from './local.storage'
import { CloudinaryStorage } from './cloudinary.storage'

export const storageAdapter =
  STORAGE_PROVIDER === 'cloudinary'
    ? new CloudinaryStorage()
    : new LocalStorage()

// Re-export để dễ import
export * from './storage.interface'
export * from './local.storage'
export * from './cloudinary.storage'
