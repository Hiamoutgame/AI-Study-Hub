import fs from 'node:fs/promises'
import path from 'node:path'
import { ObjectId } from 'mongodb'
import request from 'supertest'
import app from '~/app'
import { ExtractionStatus, PermissionLevel } from '~/constants/enum'
import { DOCUMENT_MESSAGES } from '~/constants/message'
import databaseService from '~/services/database.service'
import documentService from '~/services/document.service'
import { seedAccount, seedDocument } from '../../helpers/db'
import { createAuthHeader } from '../../helpers/http'

describe('document routes', () => {
  it('uploads document metadata and returns it from the list route', async () => {
    const account = await seedAccount()
    const authorization = await createAuthHeader(account)

    const uploadResponse = await request(app)
      .post('/documents')
      .set('Authorization', authorization)
      .field('title', 'TypeScript Notes')
      .field('tags', 'typescript,backend')
      .field('isPublic', 'false')
      .attach('file', Buffer.from('integration fixture'), {
        filename: 'notes.txt',
        contentType: 'text/plain'
      })
      .expect(201)

    expect(uploadResponse.body.data).toMatchObject({
      title: 'TypeScript Notes',
      fileName: 'notes.txt',
      tags: ['typescript', 'backend'],
      extractionStatus: 'pending',
      extractedText: ''
    })
    await expect(databaseService.solutions.countDocuments({ uploaderId: account._id })).resolves.toBe(1)

    const listResponse = await request(app).get('/documents').set('Authorization', authorization).expect(200)

    expect(listResponse.body.data).toEqual([
      expect.objectContaining({ title: 'TypeScript Notes', fileName: 'notes.txt' })
    ])
  })

  it('uploads markdown files and stores extracted text', async () => {
    const account = await seedAccount()
    const authorization = await createAuthHeader(account)

    const response = await request(app)
      .post('/documents')
      .set('Authorization', authorization)
      .field('title', 'Markdown Guide')
      .attach('file', Buffer.from('  # Study Guide\n\nKey points  '), {
        filename: 'guide.md',
        contentType: 'text/markdown'
      })
      .expect(201)

    expect(response.body.data).toMatchObject({
      title: 'Markdown Guide',
      fileName: 'guide.md',
      extractionStatus: ExtractionStatus.pending,
      extractedText: ''
    })
  })

  it('uploads image documents with skipped extraction and still supports bookmark, share, search, and download', async () => {
    const owner = await seedAccount()
    const authorization = await createAuthHeader(owner)

    const uploadResponse = await request(app)
      .post('/documents')
      .set('Authorization', authorization)
      .field('title', 'Architecture Diagram')
      .field('isPublic', 'true')
      .attach('file', Buffer.from('fake-image-content'), {
        filename: 'diagram.png',
        contentType: 'image/png'
      })
      .expect(201)

    const documentId = uploadResponse.body.data._id
    expect(uploadResponse.body.data).toMatchObject({
      fileName: 'diagram.png',
      fileExtension: '.png',
      mimeType: 'image/png',
      extractionStatus: ExtractionStatus.pending,
      extractedText: '',
      extractionErrorMessage: ''
    })

    const uploadStatusResponse = await request(app)
      .get(`/documents/${documentId}/upload-status`)
      .set('Authorization', authorization)
      .expect(200)

    expect(uploadStatusResponse.body.data).toMatchObject({
      extractionStatus: ExtractionStatus.pending,
      extractionErrorMessage: ''
    })

    const searchResponse = await request(app)
      .get('/documents?q=Architecture')
      .set('Authorization', authorization)
      .expect(200)

    expect(searchResponse.body.data).toEqual([expect.objectContaining({ _id: documentId, fileName: 'diagram.png' })])

    await request(app)
      .post(`/documents/${documentId}/bookmarks`)
      .set('Authorization', authorization)
      .send({ note: 'important image' })
      .expect(201)

    const bookmarksResponse = await request(app)
      .get('/users/me/bookmarks')
      .set('Authorization', authorization)
      .expect(200)

    expect(bookmarksResponse.body.data).toEqual([
      expect.objectContaining({
        solution: expect.objectContaining({ _id: documentId, fileExtension: '.png', title: 'Architecture Diagram' })
      })
    ])

    const shareResponse = await request(app)
      .post(`/documents/${documentId}/share`)
      .set('Authorization', authorization)
      .send({ permissionLevel: PermissionLevel.viewer, canDownload: true })
      .expect(201)

    const sharedResponse = await request(app).get(`/shared/${shareResponse.body.data.token}`).expect(200)
    expect(sharedResponse.body.data.solution).toMatchObject({
      _id: documentId,
      fileName: 'diagram.png',
      fileExtension: '.png',
      mimeType: 'image/png'
    })

    const downloadDir = path.resolve('.test-data/uploads/documents')
    await fs.mkdir(downloadDir, { recursive: true })
    const downloadPath = path.join(downloadDir, 'diagram.png')
    const relativeStorageKey = '.test-data/uploads/documents/diagram.png'
    await fs.writeFile(downloadPath, Buffer.from('fake-image-content'))
    await databaseService.solutions.updateOne(
      { _id: new ObjectId(documentId) },
      { $set: { storageKey: relativeStorageKey } }
    )

    const downloadResult = await documentService.downloadDocument({
      accountId: owner._id!.toString(),
      documentId
    })

    expect(downloadResult.document.fileName).toBe('diagram.png')
    expect(downloadResult.filePath).toContain('diagram.png')
  })

  it('rejects unsupported document file types', async () => {
    const account = await seedAccount()
    const authorization = await createAuthHeader(account)

    const response = await request(app)
      .post('/documents')
      .set('Authorization', authorization)
      .field('title', 'Executable')
      .attach('file', Buffer.from('MZ'), {
        filename: 'setup.exe',
        contentType: 'application/octet-stream'
      })
      .expect(400)

    expect(response.body.message).toBe(DOCUMENT_MESSAGES.FILE_TYPE_IS_INVALID)
  })

  it('prevents another user from reading a private document', async () => {
    const owner = await seedAccount()
    const viewer = await seedAccount()
    const document = await seedDocument(owner._id!, { isPublic: false })
    const authorization = await createAuthHeader(viewer)

    await request(app).get(`/documents/${document._id}`).set('Authorization', authorization).expect(403)
  })

  it('requires authentication for document listing', async () => {
    await request(app).get('/documents').set('Authorization', 'Bearer invalid-token').expect(401)
  })
})
