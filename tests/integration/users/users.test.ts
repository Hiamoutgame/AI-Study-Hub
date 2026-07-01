import { ObjectId } from 'mongodb'
import request from 'supertest'
import app from '~/app'
import { StorageProvider } from '~/constants/enum'
import databaseService from '~/services/database.service'
import { seedAccount } from '../../helpers/db'
import { createAuthHeader } from '../../helpers/http'

describe('user routes', () => {
  it('updates profile avatar through storage adapter without exposing storage metadata', async () => {
    const account = await seedAccount()
    const authorization = await createAuthHeader(account)

    const response = await request(app)
      .put('/users/me')
      .set('Authorization', authorization)
      .field('fullName', 'Updated User')
      .attach('avatar', Buffer.from('fake-png-content'), {
        filename: 'avatar.png',
        contentType: 'image/png'
      })
      .expect(200)

    expect(response.body.data).toMatchObject({
      fullName: 'Updated User',
      username: account.username,
      avatarUrl: expect.stringMatching(/^\/uploads\/avatars\/.+avatar\.png$/)
    })
    expect(response.body.data.avatarStorageKey).toBeUndefined()

    const updatedAccount = await databaseService.accounts.findOne({ _id: new ObjectId(account._id) })
    expect(updatedAccount).toMatchObject({
      avatarUrl: response.body.data.avatarUrl,
      avatarStorageProvider: StorageProvider.s3,
      avatarStorageBucket: 'local'
    })
    expect(updatedAccount?.avatarStorageKey).toBe(response.body.data.avatarUrl.replace(/^\//, ''))
  })
})
