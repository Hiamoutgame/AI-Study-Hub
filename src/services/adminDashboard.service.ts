import { ObjectId } from 'mongodb'
import { AiStatus, ExtractionStatus, SolutionStatus, UserRole } from '~/constants/enum'
import { DashboardQuery, StatsQuery } from '~/models/request/admin.request'
import databaseService from './database.service'

class AdminDashboardService {
  private getPeriodRange(period: DashboardQuery['period'] = 'month') {
    const now = new Date()
    const from = new Date(now)

    if (period === 'today') {
      from.setHours(0, 0, 0, 0)
    } else if (period === 'week') {
      from.setDate(now.getDate() - 7)
    } else if (period === 'year') {
      from.setFullYear(now.getFullYear() - 1)
    } else {
      from.setMonth(now.getMonth() - 1)
    }

    return { from, to: now, period: period || 'month' }
  }

  private getStatsRange(query: StatsQuery) {
    const periodRange = this.getPeriodRange('month')
    return {
      from: query.from ? new Date(query.from) : periodRange.from,
      to: query.to ? new Date(query.to) : periodRange.to,
      groupBy: query.groupBy || 'day'
    }
  }

  private getDateFormat(groupBy: string) {
    if (groupBy === 'month') {
      return '%Y-%m'
    }
    if (groupBy === 'week') {
      return '%G-W%V'
    }
    return '%Y-%m-%d'
  }

  private async countByField(collection: 'accounts' | 'solutions', field: string) {
    const source = collection === 'accounts' ? databaseService.accounts : databaseService.solutions
    const result = await source
      .aggregate<{ _id: string; count: number }>([{ $group: { _id: `$${field}`, count: { $sum: 1 } } }])
      .toArray()

    return Object.fromEntries(result.map((item) => [String(item._id), item.count]))
  }

  private async getTopCategories(limit = 5) {
    const grouped = await databaseService.solutions
      .aggregate<{
        _id: ObjectId
        documentCount: number
      }>([
        { $match: { categoryId: { $exists: true }, $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }] } },
        { $group: { _id: '$categoryId', documentCount: { $sum: 1 } } },
        { $sort: { documentCount: -1 } },
        { $limit: limit }
      ])
      .toArray()
    const categoryIds = grouped.map((item) => item._id)
    const categories = await databaseService.solutionCategories
      .find({ _id: { $in: categoryIds } })
      .project<{ _id: ObjectId; name: string }>({ _id: 1, name: 1 })
      .toArray()
    const categoryMap = new Map(categories.map((category) => [category._id.toString(), category.name]))

    return grouped.map((item) => ({
      categoryId: item._id,
      name: categoryMap.get(item._id.toString()) || '',
      documentCount: item.documentCount
    }))
  }

  private async trendByDay(collection: 'accounts' | 'solutions', from: Date, to: Date) {
    const source = collection === 'accounts' ? databaseService.accounts : databaseService.solutions
    return source
      .aggregate<{
        date: string
        count: number
      }>([
        { $match: { createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: '$_id', count: 1 } }
      ])
      .toArray()
  }

  async getDashboard(query: DashboardQuery) {
    const { from, to, period } = this.getPeriodRange(query.period)
    const [
      totalUsers,
      newUsers,
      activeUsers,
      lockedUsers,
      totalDocuments,
      newDocuments,
      publicDocuments,
      privateDocuments,
      documentSize,
      totalChatSessions,
      totalMessages,
      totalExtractionJobs,
      tokens,
      storage,
      userSignupsByDay,
      documentsUploadedByDay,
      topCategories
    ] = await Promise.all([
      databaseService.accounts.countDocuments({}),
      databaseService.accounts.countDocuments({ createdAt: { $gte: from, $lte: to } }),
      databaseService.accounts.countDocuments({ isActive: true }),
      databaseService.accounts.countDocuments({ isActive: false }),
      databaseService.solutions.countDocuments({}),
      databaseService.solutions.countDocuments({ createdAt: { $gte: from, $lte: to } }),
      databaseService.solutions.countDocuments({ isPublic: true }),
      databaseService.solutions.countDocuments({ isPublic: false }),
      databaseService.solutions
        .aggregate<{ totalSizeBytes: number }>([{ $group: { _id: null, totalSizeBytes: { $sum: '$fileSizeBytes' } } }])
        .toArray(),
      databaseService.aiChatSessions.countDocuments({}),
      databaseService.aiMessages.countDocuments({}),
      databaseService.solutions.countDocuments({ extractionStatus: { $ne: ExtractionStatus.pending } }),
      databaseService.aiMessages
        .aggregate<{ tokensConsumed: number }>([{ $group: { _id: null, tokensConsumed: { $sum: '$tokensUsed' } } }])
        .toArray(),
      databaseService.storageQuotas
        .aggregate<{
          totalAllocatedBytes: number
          totalUsedBytes: number
        }>([
          {
            $group: { _id: null, totalAllocatedBytes: { $sum: '$totalBytes' }, totalUsedBytes: { $sum: '$usedBytes' } }
          }
        ])
        .toArray(),
      this.trendByDay('accounts', from, to),
      this.trendByDay('solutions', from, to),
      this.getTopCategories()
    ])

    const storageSummary = storage[0] || { totalAllocatedBytes: 0, totalUsedBytes: 0 }
    return {
      period,
      overview: {
        totalUsers,
        newUsers,
        activeUsers,
        lockedUsers
      },
      documents: {
        totalDocuments,
        newDocuments,
        publicDocuments,
        privateDocuments,
        totalSizeBytes: documentSize[0]?.totalSizeBytes || 0
      },
      aiUsage: {
        totalChatSessions,
        totalMessages,
        totalSummaries: 0,
        totalExtractionJobs,
        tokensConsumed: tokens[0]?.tokensConsumed || 0
      },
      storage: {
        ...storageSummary,
        usagePercent:
          storageSummary.totalAllocatedBytes > 0
            ? Number(((storageSummary.totalUsedBytes / storageSummary.totalAllocatedBytes) * 100).toFixed(2))
            : 0
      },
      charts: {
        userSignupsByDay,
        documentsUploadedByDay,
        topCategories
      },
      meta: {
        from,
        to
      }
    }
  }

  async getUserStats(query: StatsQuery) {
    const { from, to, groupBy } = this.getStatsRange(query)
    const format = this.getDateFormat(groupBy)
    const [totalUsers, newUsersInPeriod, roleBreakdown, statusResult, planResult, trend] = await Promise.all([
      databaseService.accounts.countDocuments({}),
      databaseService.accounts.countDocuments({ createdAt: { $gte: from, $lte: to } }),
      this.countByField('accounts', 'role'),
      Promise.all([
        databaseService.accounts.countDocuments({ isActive: true, isEmailVerified: true }),
        databaseService.accounts.countDocuments({ isActive: false }),
        databaseService.accounts.countDocuments({ isEmailVerified: false })
      ]),
      databaseService.storageQuotas
        .aggregate<{ _id: string; count: number }>([{ $group: { _id: '$plan', count: { $sum: 1 } } }])
        .toArray(),
      databaseService.accounts
        .aggregate([
          { $match: { createdAt: { $gte: from, $lte: to } } },
          {
            $group: {
              _id: { $dateToString: { format, date: '$createdAt' } },
              newUsers: { $sum: 1 },
              activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } }
            }
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, date: '$_id', newUsers: 1, activeUsers: 1 } }
        ])
        .toArray()
    ])

    return {
      totalUsers,
      newUsersInPeriod,
      roleBreakdown: {
        user: roleBreakdown[UserRole.user] || 0,
        admin: roleBreakdown[UserRole.admin] || 0
      },
      statusBreakdown: {
        active: statusResult[0],
        locked: statusResult[1],
        unverified: statusResult[2]
      },
      planBreakdown: Object.fromEntries(planResult.map((item) => [item._id, item.count])),
      trend,
      meta: { from, to, groupBy }
    }
  }

  async getDocumentStats(query: StatsQuery) {
    const { from, to, groupBy } = this.getStatsRange(query)
    const format = this.getDateFormat(groupBy)
    const [totalDocuments, fileTypes, extractionStatus, aiStatus, topUploaders, trend] = await Promise.all([
      databaseService.solutions.countDocuments({}),
      this.countByField('solutions', 'fileExtension'),
      this.countByField('solutions', 'extractionStatus'),
      this.countByField('solutions', 'aiStatus'),
      databaseService.solutions
        .aggregate<{
          _id: ObjectId
          documentCount: number
        }>([
          { $group: { _id: '$uploaderId', documentCount: { $sum: 1 } } },
          { $sort: { documentCount: -1 } },
          { $limit: 10 }
        ])
        .toArray(),
      databaseService.solutions
        .aggregate([
          { $match: { $or: [{ createdAt: { $gte: from, $lte: to } }, { deletedAt: { $gte: from, $lte: to } }] } },
          {
            $group: {
              _id: { $dateToString: { format, date: '$createdAt' } },
              uploaded: {
                $sum: { $cond: [{ $and: [{ $gte: ['$createdAt', from] }, { $lte: ['$createdAt', to] }] }, 1, 0] }
              },
              deleted: {
                $sum: { $cond: [{ $and: [{ $gte: ['$deletedAt', from] }, { $lte: ['$deletedAt', to] }] }, 1, 0] }
              }
            }
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, date: '$_id', uploaded: 1, deleted: 1 } }
        ])
        .toArray()
    ])

    const uploaderIds = topUploaders.map((item) => item._id)
    const uploaders = await databaseService.accounts
      .find({ _id: { $in: uploaderIds } })
      .project<{ _id: ObjectId; fullName: string }>({ _id: 1, fullName: 1 })
      .toArray()
    const uploaderMap = new Map(uploaders.map((uploader) => [uploader._id.toString(), uploader.fullName]))

    return {
      totalDocuments,
      fileTypeBreakdown: fileTypes,
      extractionStatusBreakdown: {
        pending: extractionStatus[ExtractionStatus.pending] || 0,
        processing: extractionStatus[ExtractionStatus.processing] || 0,
        completed: extractionStatus[ExtractionStatus.completed] || 0,
        skipped: extractionStatus[ExtractionStatus.skipped] || 0,
        failed: extractionStatus[ExtractionStatus.failed] || 0
      },
      aiStatusBreakdown: {
        pending: aiStatus[AiStatus.pending] || 0,
        processing: aiStatus[AiStatus.processing] || 0,
        ready: aiStatus[AiStatus.ready] || 0,
        failed: aiStatus[AiStatus.failed] || 0
      },
      topUploaders: topUploaders.map((item) => ({
        accountId: item._id,
        fullName: uploaderMap.get(item._id.toString()) || '',
        documentCount: item.documentCount
      })),
      trend,
      meta: { from, to, groupBy }
    }
  }
}

const adminDashboardService = new AdminDashboardService()

export default adminDashboardService
