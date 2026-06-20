import request from 'supertest'
import app from '~/app'
import { UserRole } from '~/constants/enum'
import { seedAccount } from '../../helpers/db'
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

    const response = await request(app)
      .get('/admin/users')
      .set('Authorization', authorization)
      .expect(200)

    expect(response.body.data).toHaveLength(2)
    expect(response.body.meta).toMatchObject({ page: 1, total: 2 })
  })

  it('validates admin route query parameters', async () => {
    const admin = await seedAccount({ role: UserRole.admin })
    const authorization = await createAuthHeader(admin)

    const response = await request(app)
      .get('/admin/users?page=0')
      .set('Authorization', authorization)
      .expect(422)

    expect(response.body.errors).toHaveProperty('page')
  })
})
