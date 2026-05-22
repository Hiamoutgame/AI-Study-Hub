import { ObjectId } from 'mongodb'
import { AiConfigurationCategory, AiConfigurationDataType } from '~/constants/enum'

type AiConfigurationValue = string | number | boolean | Record<string, unknown> | unknown[]

interface AiConfigurationInput {
  _id?: ObjectId
  configKey: string
  configValue: AiConfigurationValue
  category: AiConfigurationCategory
  dataType: AiConfigurationDataType
  description?: string
  isActive?: boolean
  version?: number
  updatedBy?: ObjectId | null
  createdAt?: Date
  updatedAt?: Date
}

export class AiConfiguration implements AiConfigurationInput {
  _id?: ObjectId
  configKey: string
  configValue: AiConfigurationValue
  category: AiConfigurationCategory
  dataType: AiConfigurationDataType
  description: string
  isActive: boolean
  version: number
  updatedBy: ObjectId | null
  createdAt: Date
  updatedAt: Date

  constructor(aiConfiguration: AiConfigurationInput) {
    const now = new Date()
    this._id = aiConfiguration._id
    this.configKey = aiConfiguration.configKey
    this.configValue = aiConfiguration.configValue
    this.category = aiConfiguration.category
    this.dataType = aiConfiguration.dataType
    this.description = aiConfiguration.description || ''
    this.isActive = aiConfiguration.isActive !== undefined ? aiConfiguration.isActive : true
    this.version = aiConfiguration.version !== undefined ? aiConfiguration.version : 1
    this.updatedBy = aiConfiguration.updatedBy !== undefined ? aiConfiguration.updatedBy : null
    this.createdAt = aiConfiguration.createdAt || now
    this.updatedAt = aiConfiguration.updatedAt || now
  }
}
