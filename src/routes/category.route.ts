import express from 'express'
import { getCategoriesController } from '~/controllers/category.controller'
import { accessTokenValidator } from '~/middlewares/account.middlewares'
import { getCategoriesValidator } from '~/middlewares/category.middlewares'
import { wrapAsync } from '~/utils/handler'

const categoryRouter = express.Router()

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Get solution categories
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: parentId
 *         schema:
 *           oneOf:
 *             - { type: string, example: null }
 *             - { $ref: '#/components/schemas/ObjectId' }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [system, custom] }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean, default: true }
 *     responses:
 *       200:
 *         description: Categories returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CategoryListResponse'
 */
categoryRouter.get('/', accessTokenValidator, getCategoriesValidator, wrapAsync(getCategoriesController))

export default categoryRouter
