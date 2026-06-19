import { Router } from 'express'
import {
  createFolderController,
  deleteFolderController,
  getFolderBreadcrumbController,
  getFolderContentsController,
  moveFolderController,
  updateFolderController
} from '~/controllers/folder.controller'
import { accessTokenValidator } from '~/middlewares/account.middlewares'
import {
  createFolderValidator,
  deleteFolderValidator,
  folderIdValidator,
  getFolderContentsValidator,
  moveFolderValidator,
  updateFolderValidator
} from '~/middlewares/folder.middlewares'
import { wrapAsync } from '~/utils/handler'

const folderRouter = Router()

/**
 * @swagger
 * tags:
 *   - name: Folders
 *     description: Personal Drive-style folder management
 *
 * /folders:
 *   post:
 *     tags: [Folders]
 *     summary: Create a personal folder
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 120
 *               parentId:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Folder created
 */
folderRouter.post('/', accessTokenValidator, createFolderValidator, wrapAsync(createFolderController))

/**
 * @swagger
 * /folders/contents:
 *   get:
 *     tags: [Folders]
 *     summary: List child folders and documents at root or in a folder
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: folderId
 *         schema:
 *           type: string
 *         description: Omit to list root contents
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, name]
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Folder contents with breadcrumbs
 */
folderRouter.get('/contents', accessTokenValidator, getFolderContentsValidator, wrapAsync(getFolderContentsController))

/**
 * @swagger
 * /folders/{id}/breadcrumb:
 *   get:
 *     tags: [Folders]
 *     summary: Get a folder breadcrumb
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Breadcrumb returned
 */
folderRouter.get('/:id/breadcrumb', accessTokenValidator, folderIdValidator, wrapAsync(getFolderBreadcrumbController))

/**
 * @swagger
 * /folders/{id}:
 *   put:
 *     tags: [Folders]
 *     summary: Rename a folder
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 120
 *     responses:
 *       200:
 *         description: Folder renamed
 */
folderRouter.put(
  '/:id',
  accessTokenValidator,
  folderIdValidator,
  updateFolderValidator,
  wrapAsync(updateFolderController)
)

/**
 * @swagger
 * /folders/{id}/move:
 *   put:
 *     tags: [Folders]
 *     summary: Move a folder with cycle prevention
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               parentId:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Folder moved
 */
folderRouter.put(
  '/:id/move',
  accessTokenValidator,
  folderIdValidator,
  moveFolderValidator,
  wrapAsync(moveFolderController)
)

/**
 * @swagger
 * /folders/{id}:
 *   delete:
 *     tags: [Folders]
 *     summary: Soft-delete a folder, its subtree, and contained documents
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [confirm]
 *             properties:
 *               confirm:
 *                 type: boolean
 *                 enum: [true]
 *     responses:
 *       200:
 *         description: Folder subtree cascade deleted
 */
folderRouter.delete(
  '/:id',
  accessTokenValidator,
  folderIdValidator,
  deleteFolderValidator,
  wrapAsync(deleteFolderController)
)

export default folderRouter
