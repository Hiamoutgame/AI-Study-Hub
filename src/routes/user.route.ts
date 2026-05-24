import express from 'express'
import { changePasswordController, updateProfileController } from '~/controllers/user.controller'
import { accessTokenValidator } from '~/middlewares/account.middlewares'
import { uploadAvatar } from '~/middlewares/upload.middlewares'
import { changePasswordValidator, updateProfileValidator } from '~/middlewares/user.middlewares'
import { wrapAsync } from '~/utils/handler'

const userRouter = express.Router()

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
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               username:
 *                 type: string
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               username:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         description: Access token is required or account is inactive
 *       403:
 *         description: Email is not verified
 *       422:
 *         description: Validation error or username already exists
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
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password changed
 *       401:
 *         description: Access token is required or account is inactive
 *       403:
 *         description: Email is not verified
 *       422:
 *         description: Validation error or current password is incorrect
 */
userRouter.put('/me/password', accessTokenValidator, changePasswordValidator, wrapAsync(changePasswordController))

export default userRouter
