import express from 'express'
import {
  changePasswordController,
  getProfileController,
  getStorageController,
  updateProfileController
} from '~/controllers/user.controller'
import { getMyNotificationsController, markMyNotificationReadController } from '~/controllers/notification.controller'
import { getMyBookmarksController } from '~/controllers/sharing.controller'
import { accessTokenValidator } from '~/middlewares/account.middlewares'
import { getMyNotificationsValidator, notificationIdValidator } from '~/middlewares/notification.middlewares'
import { getBookmarksValidator } from '~/middlewares/sharing.middlewares'
import { uploadAvatar } from '~/middlewares/upload.middlewares'
import { changePasswordValidator, updateProfileValidator } from '~/middlewares/user.middlewares'
import { wrapAsync } from '~/utils/handler'

const userRouter = express.Router()

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get current user profile
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileResponse'
 *       401:
 *         description: Access token is required or account is inactive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Email is not verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
userRouter.get('/me', accessTokenValidator, wrapAsync(getProfileController))

/**
 * @swagger
 * /users/me/storage:
 *   get:
 *     summary: Get current user storage quota
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Storage quota returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StorageQuotaResponse'
 *       401:
 *         description: Access token is required or account is inactive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Email is not verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
userRouter.get('/me/storage', accessTokenValidator, wrapAsync(getStorageController))

/**
 * @swagger
 * /users/me/bookmarks:
 *   get:
 *     summary: Get current user bookmarks
 *     tags: [Bookmarks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Bookmarks returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 */
userRouter.get('/me/bookmarks', accessTokenValidator, getBookmarksValidator, wrapAsync(getMyBookmarksController))

/**
 * @swagger
 * /users/me/notifications:
 *   get:
 *     summary: Get current user notifications
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isRead
 *         schema: { type: boolean }
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Notifications returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserNotificationsResponse'
 */
userRouter.get(
  '/me/notifications',
  accessTokenValidator,
  getMyNotificationsValidator,
  wrapAsync(getMyNotificationsController)
)

/**
 * @swagger
 * /users/me/notifications/{id}/read:
 *   put:
 *     summary: Mark current user notification as read
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { $ref: '#/components/schemas/ObjectId' }
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MarkNotificationReadResponse'
 */
userRouter.put(
  '/me/notifications/:id/read',
  accessTokenValidator,
  notificationIdValidator,
  wrapAsync(markMyNotificationReadController)
)

/**
 * @swagger
 * /users/me:
 *   put:
 *     summary: Update current user profile
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileMultipartRequest'
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UpdateProfileResponse'
 *       401:
 *         description: Access token is required or account is inactive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Email is not verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation error or username already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 */
userRouter.put('/me', accessTokenValidator, uploadAvatar, updateProfileValidator, wrapAsync(updateProfileController))

/**
 * @swagger
 * /users/me/password:
 *   put:
 *     summary: Change current user password
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *     responses:
 *       200:
 *         description: Password changed
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/NullDataResponse'
 *               example:
 *                 message: Change password success
 *                 data: null
 *       401:
 *         description: Access token is required or account is inactive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Email is not verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation error or current password is incorrect
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 */
userRouter.put('/me/password', accessTokenValidator, changePasswordValidator, wrapAsync(changePasswordController))

export default userRouter
