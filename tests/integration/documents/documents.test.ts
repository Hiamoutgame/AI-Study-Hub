import request from 'supertest'
import app from '~/app'
import databaseService from '~/services/database.service'
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
      extractionStatus: 'completed',
      extractedText: 'integration fixture'
    })
    await expect(databaseService.solutions.countDocuments({ uploaderId: account._id })).resolves.toBe(1)

    const listResponse = await request(app)
      .get('/documents')
      .set('Authorization', authorization)
      .expect(200)

    expect(listResponse.body.data).toEqual([
      expect.objectContaining({ title: 'TypeScript Notes', fileName: 'notes.txt' })
    ])
  })

  it('prevents another user from reading a private document', async () => {
    const owner = await seedAccount()
    const viewer = await seedAccount()
    const document = await seedDocument(owner._id!, { isPublic: false })
    const authorization = await createAuthHeader(viewer)

    await request(app)
      .get(`/documents/${document._id}`)
      .set('Authorization', authorization)
      .expect(403)
  })

  it('requires authentication for document listing', async () => {
    await request(app).get('/documents').set('Authorization', 'Bearer invalid-token').expect(401)
  })
})
