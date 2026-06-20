import request from 'supertest'
import app from '~/app'
import databaseService from '~/services/database.service'
import { createAuthHeader } from '../../helpers/http'
import { seedAccount } from '../../helpers/db'

describe('folder routes', () => {
  it('creates a root folder for the authenticated owner', async () => {
    const account = await seedAccount()
    const authorization = await createAuthHeader(account)

    const response = await request(app)
      .post('/folders')
      .set('Authorization', authorization)
      .send({ name: 'Algorithms' })
      .expect(201)

    expect(response.body.data).toMatchObject({ name: 'Algorithms', ownerId: account._id?.toString() })
    await expect(databaseService.folders.countDocuments({ ownerId: account._id })).resolves.toBe(1)
  })

  it('validates parentId before reaching the service', async () => {
    const account = await seedAccount()
    const authorization = await createAuthHeader(account)

    const response = await request(app)
      .post('/folders')
      .set('Authorization', authorization)
      .send({ name: 'Algorithms', parentId: 'invalid-object-id' })
      .expect(422)

    expect(response.body.errors).toHaveProperty('parentId')
  })

  it('rejects an invalid access token', async () => {
    await request(app).get('/folders/contents').set('Authorization', 'Bearer invalid-token').expect(401)
  })
})
