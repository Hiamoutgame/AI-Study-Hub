import express from 'express'
import {
  createAdminCategoryController,
  deleteAdminCategoryController,
  deleteAdminDocumentController,
  deleteAdminUserController,
  flagAdminDocumentController,
  getAdminDashboardController,
  getAdminDocumentsController,
  getAdminDocumentStatsController,
  getAdminNotificationsController,
  getAdminUserDetailController,
  getAdminUsersController,
  getAdminUserStatsController,
  sendAdminNotificationController,
  updateAdminCategoryController,
  updateAdminUserRoleController,
  updateAdminUserStatusController,
  updateAdminUserStorageQuotaController
} from '~/controllers/admin.controller'
import { accessTokenValidator } from '~/middlewares/account.middlewares'
import {
  adminDocumentIdValidator,
  adminRoleValidator,
  adminUserIdValidator,
  dashboardQueryValidator,
  deleteUserValidator,
  flagDocumentValidator,
  getAdminDocumentsValidator,
  getAdminUsersValidator,
  statsQueryValidator,
  updateUserRoleValidator,
  updateUserStatusValidator,
  updateUserStorageQuotaValidator,
  adminDeleteDocumentValidator
} from '~/middlewares/admin.middlewares'
import {
  categoryIdValidator,
  createCategoryValidator,
  deleteCategoryValidator,
  updateCategoryValidator
} from '~/middlewares/category.middlewares'
import { getAdminNotificationsValidator, sendNotificationValidator } from '~/middlewares/notification.middlewares'
import { wrapAsync } from '~/utils/handler'

const adminRouter = express.Router()

const adminAuth = [accessTokenValidator, wrapAsync(adminRoleValidator)]

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Admin list users
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [user, admin] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, locked, unverified] }
 *       - in: query
 *         name: plan
 *         schema: { type: string, enum: [free, student, premium, admin] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [createdAt, fullName, lastLoginAt] }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: Users returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminUserListResponse'
 */
adminRouter.get('/users', ...adminAuth, getAdminUsersValidator, wrapAsync(getAdminUsersController))

/**
 * @swagger
 * /admin/users/{id}:
 *   get:
 *     summary: Admin get user detail
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: '#/components/schemas/ObjectId' }
 *     responses:
 *       200:
 *         description: User detail returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminUserDetailResponse'
 */
adminRouter.get('/users/:id', ...adminAuth, adminUserIdValidator, wrapAsync(getAdminUserDetailController))

/**
 * @swagger
 * /admin/users/{id}/status:
 *   put:
 *     summary: Admin lock or unlock user
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: '#/components/schemas/ObjectId' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminUpdateUserStatusRequest'
 *     responses:
 *       200:
 *         description: User status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminUpdateUserStatusResponse'
 */
adminRouter.put(
  '/users/:id/status',
  ...adminAuth,
  adminUserIdValidator,
  updateUserStatusValidator,
  wrapAsync(updateAdminUserStatusController)
)

/**
 * @swagger
 * /admin/users/{id}/role:
 *   put:
 *     summary: Admin update user role
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: '#/components/schemas/ObjectId' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminUpdateUserRoleRequest'
 *     responses:
 *       200:
 *         description: User role updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminUpdateUserRoleResponse'
 */
adminRouter.put(
  '/users/:id/role',
  ...adminAuth,
  adminUserIdValidator,
  updateUserRoleValidator,
  wrapAsync(updateAdminUserRoleController)
)

/**
 * @swagger
 * /admin/users/{id}/storage-quota:
 *   put:
 *     summary: Admin update user storage quota
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: '#/components/schemas/ObjectId' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminUpdateUserStorageQuotaRequest'
 *     responses:
 *       200:
 *         description: User storage quota updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminUpdateUserStorageQuotaResponse'
 */
adminRouter.put(
  '/users/:id/storage-quota',
  ...adminAuth,
  adminUserIdValidator,
  updateUserStorageQuotaValidator,
  wrapAsync(updateAdminUserStorageQuotaController)
)

/**
 * @swagger
 * /admin/users/{id}:
 *   delete:
 *     summary: Admin soft delete user
 *     tags: [Admin Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: '#/components/schemas/ObjectId' }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminDeleteUserRequest'
 *     responses:
 *       200:
 *         description: User soft deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminDeleteUserResponse'
 */
adminRouter.delete(
  '/users/:id',
  ...adminAuth,
  adminUserIdValidator,
  deleteUserValidator,
  wrapAsync(deleteAdminUserController)
)

/**
 * @swagger
 * /admin/documents:
 *   get:
 *     summary: Admin list all documents
 *     tags: [Admin Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: uploaderId
 *         schema: { $ref: '#/components/schemas/ObjectId' }
 *       - in: query
 *         name: categoryId
 *         schema: { $ref: '#/components/schemas/ObjectId' }
 *       - in: query
 *         name: isPublic
 *         schema: { type: boolean }
 *       - in: query
 *         name: ocrStatus
 *         schema: { type: string }
 *       - in: query
 *         name: aiStatus
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: flagged
 *         schema: { type: boolean }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Documents returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminDocumentListResponse'
 */
adminRouter.get('/documents', ...adminAuth, getAdminDocumentsValidator, wrapAsync(getAdminDocumentsController))

/**
 * @swagger
 * /admin/documents/{id}/flag:
 *   post:
 *     summary: Admin flag document
 *     tags: [Admin Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: '#/components/schemas/ObjectId' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminFlagDocumentRequest'
 *     responses:
 *       200:
 *         description: Document flagged
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminFlagDocumentResponse'
 */
adminRouter.post(
  '/documents/:id/flag',
  ...adminAuth,
  adminDocumentIdValidator,
  flagDocumentValidator,
  wrapAsync(flagAdminDocumentController)
)

/**
 * @swagger
 * /admin/documents/{id}:
 *   delete:
 *     summary: Admin soft delete document
 *     tags: [Admin Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: '#/components/schemas/ObjectId' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminDeleteDocumentRequest'
 *     responses:
 *       200:
 *         description: Document soft deleted by admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminDeleteDocumentResponse'
 */
adminRouter.delete(
  '/documents/:id',
  ...adminAuth,
  adminDocumentIdValidator,
  adminDeleteDocumentValidator,
  wrapAsync(deleteAdminDocumentController)
)

/**
 * @swagger
 * /admin/categories:
 *   post:
 *     summary: Admin create category
 *     tags: [Admin Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCategoryRequest'
 *     responses:
 *       201:
 *         description: Category created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryResponse'
 */
adminRouter.post('/categories', ...adminAuth, createCategoryValidator, wrapAsync(createAdminCategoryController))

/**
 * @swagger
 * /admin/categories/{id}:
 *   put:
 *     summary: Admin update category
 *     tags: [Admin Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: '#/components/schemas/ObjectId' }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCategoryRequest'
 *     responses:
 *       200:
 *         description: Category updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryResponse'
 */
adminRouter.put(
  '/categories/:id',
  ...adminAuth,
  categoryIdValidator,
  updateCategoryValidator,
  wrapAsync(updateAdminCategoryController)
)

/**
 * @swagger
 * /admin/categories/{id}:
 *   delete:
 *     summary: Admin delete category
 *     tags: [Admin Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: '#/components/schemas/ObjectId' }
 *       - in: query
 *         name: migrateTo
 *         schema: { $ref: '#/components/schemas/ObjectId' }
 *     responses:
 *       200:
 *         description: Category deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryDeleteResponse'
 */
adminRouter.delete(
  '/categories/:id',
  ...adminAuth,
  categoryIdValidator,
  deleteCategoryValidator,
  wrapAsync(deleteAdminCategoryController)
)

/**
 * @swagger
 * /admin/notifications:
 *   post:
 *     summary: Admin send notification
 *     tags: [Admin Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendNotificationRequest'
 *     responses:
 *       201:
 *         description: Notification fan-out completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminSendNotificationResponse'
 *   get:
 *     summary: Admin notification history
 *     tags: [Admin Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *       - in: query
 *         name: senderId
 *         schema: { $ref: '#/components/schemas/ObjectId' }
 *       - in: query
 *         name: sourceEventId
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Notification history returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminNotificationListResponse'
 */
adminRouter.post('/notifications', ...adminAuth, sendNotificationValidator, wrapAsync(sendAdminNotificationController))
adminRouter.get(
  '/notifications',
  ...adminAuth,
  getAdminNotificationsValidator,
  wrapAsync(getAdminNotificationsController)
)

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Admin dashboard summary
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [today, week, month, year] }
 *     responses:
 *       200:
 *         description: Dashboard returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminDashboardResponse'
 */
adminRouter.get('/dashboard', ...adminAuth, dashboardQueryValidator, wrapAsync(getAdminDashboardController))

/**
 * @swagger
 * /admin/stats/users:
 *   get:
 *     summary: Admin user statistics
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: groupBy
 *         schema: { type: string, enum: [day, week, month] }
 *     responses:
 *       200:
 *         description: User statistics returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminUserStatsResponse'
 */
adminRouter.get('/stats/users', ...adminAuth, statsQueryValidator, wrapAsync(getAdminUserStatsController))

/**
 * @swagger
 * /admin/stats/documents:
 *   get:
 *     summary: Admin document statistics
 *     tags: [Admin Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: groupBy
 *         schema: { type: string, enum: [day, week, month] }
 *     responses:
 *       200:
 *         description: Document statistics returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminDocumentStatsResponse'
 */
adminRouter.get('/stats/documents', ...adminAuth, statsQueryValidator, wrapAsync(getAdminDocumentStatsController))

export default adminRouter
