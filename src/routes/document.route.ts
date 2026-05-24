import express from 'express'
import {
  getDocumentDetailController,
  getDocumentsController,
  updateDocumentController,
  uploadDocumentController
} from '~/controllers/document.controller'
import { accessTokenValidator } from '~/middlewares/account.middlewares'
import {
  documentIdValidator,
  getDocumentsValidator,
  updateDocumentValidator,
  uploadDocumentValidator
} from '~/middlewares/document.middlewares'
import { uploadDocumentFile } from '~/middlewares/upload.middlewares'
import { wrapAsync } from '~/utils/handler'

const documentRouter = express.Router()

/**
 * @swagger
 * /documents:
 *   post:
 *     summary: Upload a document
 *     tags:
 *       - Documents
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - title
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               tags:
 *                 type: string
 *               language:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *               enableOcr:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Document uploaded
 *       400:
 *         description: File is missing, invalid, or exceeds limits
 *       401:
 *         description: Access token is required or account is inactive
 *       403:
 *         description: Email is not verified
 *       422:
 *         description: Validation error
 */
documentRouter.post(
  '/',
  accessTokenValidator,
  uploadDocumentFile,
  uploadDocumentValidator,
  wrapAsync(uploadDocumentController)
)

/**
 * @swagger
 * /documents:
 *   get:
 *     summary: Get documents with search, filters, sorting, and pagination
 *     tags:
 *       - Documents
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *       - in: query
 *         name: isPublic
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: aiStatus
 *         schema:
 *           type: string
 *           enum: [pending, processing, ready, failed]
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, title, fileSizeBytes]
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Documents returned
 */
documentRouter.get('/', accessTokenValidator, getDocumentsValidator, wrapAsync(getDocumentsController))

/**
 * @swagger
 * /documents/{id}:
 *   get:
 *     summary: Get document detail
 *     tags:
 *       - Documents
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
 *         description: Document detail returned
 *       403:
 *         description: Document access denied
 *       404:
 *         description: Document not found
 */
documentRouter.get('/:id', accessTokenValidator, documentIdValidator, wrapAsync(getDocumentDetailController))

/**
 * @swagger
 * /documents/{id}:
 *   put:
 *     summary: Update document metadata
 *     tags:
 *       - Documents
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               isPublic:
 *                 type: boolean
 *               language:
 *                 type: string
 *     responses:
 *       200:
 *         description: Document updated
 *       403:
 *         description: Only owner can update document
 *       404:
 *         description: Document not found
 *       422:
 *         description: Validation error
 */
documentRouter.put(
  '/:id',
  accessTokenValidator,
  documentIdValidator,
  updateDocumentValidator,
  wrapAsync(updateDocumentController)
)

export default documentRouter
