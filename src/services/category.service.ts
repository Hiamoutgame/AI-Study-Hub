import { Filter, ObjectId } from 'mongodb'
import { ActivityAction, ActivityEntityType, SolutionCategoryType } from '~/constants/enum'
import HTTP_STATUS from '~/constants/httpStatus'
import { CATEGORY_MESSAGES } from '~/constants/message'
import { ActivityLog } from '~/models/ActivityLog.schema'
import { ErrorWithStatus } from '~/models/Error'
import {
  CreateCategoryReqBody,
  DeleteCategoryQuery,
  GetCategoriesQuery,
  UpdateCategoryReqBody
} from '~/models/request/category.request'
import { SolutionCategory } from '~/models/SolutionCategory.schema'
import databaseService from './database.service'

class CategoryService {
  private toObjectId(id: string) {
    return new ObjectId(id)
  }

  private parseBoolean(value: boolean | string | undefined, defaultValue = true) {
    if (typeof value === 'boolean') {
      return value
    }
    if (value === 'true') {
      return true
    }
    if (value === 'false') {
      return false
    }
    return defaultValue
  }

  private async createActivityLog({
    adminId,
    action,
    categoryId,
    metadata
  }: {
    adminId: ObjectId
    action: ActivityAction
    categoryId: ObjectId
    metadata?: Record<string, unknown>
  }) {
    await databaseService.activityLogs.insertOne(
      new ActivityLog({
        accountId: adminId,
        action,
        entityType: ActivityEntityType.category,
        entityId: categoryId,
        metadata
      })
    )
  }

  private async getCategoryOrThrow(categoryId: ObjectId) {
    const category = await databaseService.solutionCategories.findOne({ _id: categoryId })
    if (!category) {
      throw new ErrorWithStatus(CATEGORY_MESSAGES.CATEGORY_NOT_FOUND, HTTP_STATUS.NOT_FOUND)
    }
    return category
  }

  private async ensureUnique({ name, slug, excludeId }: { name?: string; slug?: string; excludeId?: ObjectId }) {
    if (!name && !slug) {
      return
    }

    const orFilters = []
    if (name) {
      orFilters.push({ name })
    }
    if (slug) {
      orFilters.push({ slug })
    }

    const duplicated = await databaseService.solutionCategories.findOne({
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
      $or: orFilters
    })

    if (duplicated) {
      throw new ErrorWithStatus(CATEGORY_MESSAGES.CATEGORY_ALREADY_EXISTS, HTTP_STATUS.UNPROCESSABLE_ENTITY)
    }
  }

  private async validateParent(parentId?: string) {
    if (!parentId) {
      return undefined
    }

    const parentObjectId = this.toObjectId(parentId)
    const parent = await databaseService.solutionCategories.findOne({ _id: parentObjectId, isActive: true })
    if (!parent) {
      throw new ErrorWithStatus(CATEGORY_MESSAGES.CATEGORY_NOT_FOUND, HTTP_STATUS.UNPROCESSABLE_ENTITY)
    }
    return parentObjectId
  }

  async getCategories(query: GetCategoriesQuery) {
    const filter: Filter<SolutionCategory> = {}

    if (query.parentId === 'null') {
      filter.$or = [{ parentId: { $exists: false } }, { parentId: null }] as Filter<SolutionCategory>['$or']
    } else if (query.parentId) {
      filter.parentId = this.toObjectId(query.parentId)
    }

    if (query.type) {
      filter.type = query.type as SolutionCategoryType
    }

    filter.isActive = this.parseBoolean(query.isActive, true)

    const categories = await databaseService.solutionCategories.find(filter).sort({ sortOrder: 1, name: 1 }).toArray()
    const categoryIds = categories.map((category) => category._id as ObjectId)
    const counts = await databaseService.solutions
      .aggregate<{
        _id: ObjectId
        count: number
      }>([
        { $match: { categoryId: { $in: categoryIds }, $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }] } },
        { $group: { _id: '$categoryId', count: { $sum: 1 } } }
      ])
      .toArray()

    const countMap = new Map(counts.map((item) => [item._id.toString(), item.count]))

    return categories.map((category) => ({
      _id: category._id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon,
      color: category.color,
      type: category.type,
      parentId: category.parentId || null,
      acceptedExtensions: category.acceptedExtensions,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      documentCount: countMap.get((category._id as ObjectId).toString()) || 0,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    }))
  }

  async createCategory({ adminId, payload }: { adminId: string; payload: CreateCategoryReqBody }) {
    const adminObjectId = this.toObjectId(adminId)
    await this.ensureUnique({ name: payload.name.trim(), slug: payload.slug.trim() })
    const parentId = await this.validateParent(payload.parentId)
    const categoryId = new ObjectId()
    const category = new SolutionCategory({
      _id: categoryId,
      createdBy: adminObjectId,
      parentId,
      name: payload.name.trim(),
      slug: payload.slug.trim(),
      description: payload.description?.trim(),
      icon: payload.icon?.trim(),
      color: payload.color,
      type: payload.type || SolutionCategoryType.custom,
      acceptedExtensions: payload.acceptedExtensions,
      sortOrder: payload.sortOrder
    })

    await databaseService.solutionCategories.insertOne(category)
    await this.createActivityLog({
      adminId: adminObjectId,
      action: ActivityAction.adminCreateCategory,
      categoryId,
      metadata: { name: category.name, slug: category.slug }
    })

    return category
  }

  async updateCategory({
    adminId,
    categoryId,
    payload
  }: {
    adminId: string
    categoryId: string
    payload: UpdateCategoryReqBody
  }) {
    const adminObjectId = this.toObjectId(adminId)
    const categoryObjectId = this.toObjectId(categoryId)
    await this.getCategoryOrThrow(categoryObjectId)

    await this.ensureUnique({
      name: payload.name?.trim(),
      slug: payload.slug?.trim(),
      excludeId: categoryObjectId
    })

    const updateData: Partial<SolutionCategory> = {
      updatedAt: new Date()
    }

    if (payload.name !== undefined) updateData.name = payload.name.trim()
    if (payload.slug !== undefined) updateData.slug = payload.slug.trim()
    if (payload.description !== undefined) updateData.description = payload.description.trim()
    if (payload.icon !== undefined) updateData.icon = payload.icon.trim()
    if (payload.color !== undefined) updateData.color = payload.color
    if (payload.type !== undefined) updateData.type = payload.type
    if (payload.acceptedExtensions !== undefined) updateData.acceptedExtensions = payload.acceptedExtensions
    if (payload.sortOrder !== undefined) updateData.sortOrder = Number(payload.sortOrder)
    if (payload.isActive !== undefined) updateData.isActive = this.parseBoolean(payload.isActive)
    if (payload.parentId !== undefined) updateData.parentId = await this.validateParent(payload.parentId)

    const updated = await databaseService.solutionCategories.findOneAndUpdate(
      { _id: categoryObjectId },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    await this.createActivityLog({
      adminId: adminObjectId,
      action: ActivityAction.adminUpdateCategory,
      categoryId: categoryObjectId,
      metadata: payload as Record<string, unknown>
    })

    return updated
  }

  async deleteCategory({
    adminId,
    categoryId,
    query
  }: {
    adminId: string
    categoryId: string
    query: DeleteCategoryQuery
  }) {
    const adminObjectId = this.toObjectId(adminId)
    const categoryObjectId = this.toObjectId(categoryId)
    await this.getCategoryOrThrow(categoryObjectId)

    const usedDocuments = await databaseService.solutions.countDocuments({ categoryId: categoryObjectId })
    let migratedDocuments = 0
    let migratedToCategory: ObjectId | null = null

    if (usedDocuments > 0) {
      if (!query.migrateTo) {
        throw new ErrorWithStatus(CATEGORY_MESSAGES.CATEGORY_IS_IN_USE, HTTP_STATUS.BAD_REQUEST)
      }

      migratedToCategory = this.toObjectId(query.migrateTo)
      if (migratedToCategory.equals(categoryObjectId)) {
        throw new ErrorWithStatus(CATEGORY_MESSAGES.CANNOT_MIGRATE_TO_SAME_CATEGORY, HTTP_STATUS.BAD_REQUEST)
      }

      const migrationTarget = await this.getCategoryOrThrow(migratedToCategory)
      if (!migrationTarget.isActive) {
        throw new ErrorWithStatus(CATEGORY_MESSAGES.CATEGORY_NOT_FOUND, HTTP_STATUS.UNPROCESSABLE_ENTITY)
      }
      const migrationResult = await databaseService.solutions.updateMany(
        { categoryId: categoryObjectId },
        { $set: { categoryId: migratedToCategory, updatedAt: new Date() } }
      )
      migratedDocuments = migrationResult.modifiedCount
    }

    await databaseService.solutionCategories.updateOne(
      { _id: categoryObjectId },
      { $set: { isActive: false, updatedAt: new Date() } }
    )

    await this.createActivityLog({
      adminId: adminObjectId,
      action: ActivityAction.adminDeleteCategory,
      categoryId: categoryObjectId,
      metadata: { migratedDocuments, migratedToCategory }
    })

    return {
      _id: categoryObjectId,
      migratedDocuments,
      migratedToCategory
    }
  }
}

const categoryService = new CategoryService()

export default categoryService
