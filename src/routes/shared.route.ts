import express from 'express'
import { getSharedFileController, resolveSharedLinkController } from '~/controllers/sharing.controller'
import { shareTokenValidator } from '~/middlewares/sharing.middlewares'
import { wrapAsync } from '~/utils/handler'

const sharedRouter = express.Router()

/**
 * @swagger
 * /shared/{token}:
 *   get:
 *     summary: Resolve a public document share link
 *     tags: [Sharing]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Shared document returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       403:
 *         description: Share link expired or usage limit reached
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Share link or document not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
sharedRouter.get('/:token/file', shareTokenValidator, wrapAsync(getSharedFileController))
sharedRouter.get('/:token', shareTokenValidator, wrapAsync(resolveSharedLinkController))

export default sharedRouter
