import request from 'supertest'
import app from '~/app'
import { ExtractionStatus, UserRole } from '~/constants/enum'
import { seedAccount, seedDocument } from '../../helpers/db'
import { createAuthHeader } from '../../helpers/http'

describe('admin routes', () => {
  it('rejects a normal user from admin endpoints', async () => {
    const account = await seedAccount({ role: UserRole.user })
    const authorization = await createAuthHeader(account)

    await request(app).get('/admin/users').set('Authorization', authorization).expect(403)
  })

  it('allows an active verified admin to list users', async () => {
    const admin = await seedAccount({ role: UserRole.admin })
    await seedAccount({ role: UserRole.user })
    const authorization = await createAuthHeader(admin)

    const response = await request(app).get('/admin/users').set('Authorization', authorization).expect(200)

    expect(response.body.data).toHaveLength(2)
    expect(response.body.meta).toMatchObject({ page: 1, total: 2 })
  })

  it('validates admin route query parameters', async () => {
    const admin = await seedAccount({ role: UserRole.admin })
    const authorization = await createAuthHeader(admin)

    const response = await request(app).get('/admin/users?page=0').set('Authorization', authorization).expect(422)

    expect(response.body.errors).toHaveProperty('page')
  })

  it('filters admin documents by skipped extraction status and includes skipped in stats breakdown', async () => {
    const admin = await seedAccount({ role: UserRole.admin })
    const uploader = await seedAccount({ role: UserRole.user })
    const authorization = await createAuthHeader(admin)

    await seedDocument(uploader._id!, {
      title: 'Image Document',
      fileName: 'image.png',
      fileExtension: '.png',
      mimeType: 'image/png',
      extractionStatus: ExtractionStatus.skipped
    })
    await seedDocument(uploader._id!, {
      title: 'Text Document',
      fileName: 'notes.txt',
      fileExtension: '.txt',
      mimeType: 'text/plain',
      extractionStatus: ExtractionStatus.completed
    })

    const documentsResponse = await request(app)
      .get('/admin/documents?extractionStatus=skipped')
      .set('Authorization', authorization)
      .expect(200)

    expect(documentsResponse.body.data).toHaveLength(1)
    expect(documentsResponse.body.data[0]).toMatchObject({
      title: 'Image Document',
      extractionStatus: ExtractionStatus.skipped
    })

    const statsResponse = await request(app)
      .get('/admin/stats/documents')
      .set('Authorization', authorization)
      .expect(200)

    expect(statsResponse.body.data.extractionStatusBreakdown).toMatchObject({
      skipped: 1,
      completed: 1
    })
  })
})
