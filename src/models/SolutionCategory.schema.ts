import { ObjectId } from 'mongodb'
import { SolutionCategoryType } from '~/constants/enum'

interface SolutionCategoryTypeInput {
  _id?: ObjectId
  createdBy?: ObjectId
  parentId?: ObjectId
  name: string
  slug: string
  description?: string
  icon?: string
  color?: string
  type?: SolutionCategoryType
  acceptedExtensions?: string[]
  sortOrder?: number
  isActive?: boolean
  createdAt?: Date
  updatedAt?: Date
}

export class SolutionCategory implements SolutionCategoryTypeInput {
  _id?: ObjectId
  createdBy: ObjectId
  parentId: ObjectId
  name: string
  slug: string
  description: string
  icon: string
  color: string
  type: SolutionCategoryType
  acceptedExtensions: string[]
  sortOrder: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date

  constructor(solutionCategory: SolutionCategoryTypeInput) {
    const now = new Date()
    this._id = solutionCategory._id
    this.createdBy = solutionCategory.createdBy || new ObjectId()
    this.parentId = solutionCategory.parentId || new ObjectId()
    this.name = solutionCategory.name
    this.slug = solutionCategory.slug
    this.description = solutionCategory.description || ''
    this.icon = solutionCategory.icon || ''
    this.color = solutionCategory.color || '#999999'
    this.type = solutionCategory.type || SolutionCategoryType.custom
    this.acceptedExtensions = solutionCategory.acceptedExtensions || []
    this.sortOrder = solutionCategory.sortOrder || 0
    this.isActive = solutionCategory.isActive || true
    this.createdAt = solutionCategory.createdAt || now
    this.updatedAt = solutionCategory.updatedAt || now
  }
}
