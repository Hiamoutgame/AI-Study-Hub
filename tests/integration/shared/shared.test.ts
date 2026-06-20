import request from 'supertest'
import app from '~/app'
import databaseService from '~/services/database.service'
import { seedAccount, seedDocument, seedPermissionLink } from '../../helpers/db'

describe('shared routes', () => {
  it('resolves an active public share link without authentication', async () => {
    const owner = await seedAccount()
    const document = await seedDocument(owner._id!, { title: 'Shared Notes' })
    const link = await seedPermissionLink(document._id!, owner._id!, { maxUses: 5 })

    const response = await request(app).get(`/shared/${link.token}`).expect(200)

    expect(response.body.data).toMatchObject({
      solution: { title: 'Shared Notes' },
      permissionLevel: link.permissionLevel
    })
    const updatedLink = await databaseService.permissionLinks.findOne({ _id: link._id })
    expect(updatedLink?.currentUses).toBe(1)
  })

  it('rejects an expired share link', async () => {
    const owner = await seedAccount()
    const document = await seedDocument(owner._id!)
    const link = await seedPermissionLink(document._id!, owner._id!, {
      maxUses: 5,
      expiresAt: new Date(Date.now() - 1000)
    })

    await request(app).get(`/shared/${link.token}`).expect(403)
  })

  it('returns not found for an unknown token', async () => {
    await request(app).get('/shared/unknown-share-token').expect(404)
  })
})
