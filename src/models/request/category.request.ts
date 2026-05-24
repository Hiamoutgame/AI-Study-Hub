import { ParsedQs } from 'qs'
import { SolutionCategoryType } from '~/constants/enum'

export interface GetCategoriesQuery extends ParsedQs {
  parentId?: string
  type?: SolutionCategoryType
  isActive?: string
}

export interface CreateCategoryReqBody {
  name: string
  slug: string
  description?: string
  icon?: string
  color?: string
  type?: SolutionCategoryType
  parentId?: string
  acceptedExtensions?: string[]
  sortOrder?: number
}

export interface UpdateCategoryReqBody {
  name?: string
  slug?: string
  description?: string
  icon?: string
  color?: string
  type?: SolutionCategoryType
  parentId?: string
  acceptedExtensions?: string[]
  sortOrder?: number
  isActive?: boolean
}

export interface DeleteCategoryQuery extends ParsedQs {
  migrateTo?: string
}
