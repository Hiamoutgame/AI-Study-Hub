import request from 'supertest'
import app from '~/app'
import databaseService from '~/services/database.service'
import { seedAccount } from '../../helpers/db'

describe('POST /account/verify-email', () => {
  it('verifies an account with the correct unexpired OTP', async () => {
    const account = await seedAccount({
      email: 'verify@example.com',
      isEmailVerified: false,
      emailVerifyToken: '123456',
      emailVerifyTokenExpires: new Date(Date.now() + 60_000)
    })

    await request(app).post('/account/verify-email').send({ email: account.email, otp: '123456' }).expect(200)

    const updated = await databaseService.accounts.findOne({ _id: account._id })
    expect(updated).toMatchObject({ isEmailVerified: true, emailVerifyToken: '' })
  })

  it('rejects a wrong OTP', async () => {
    const account = await seedAccount({
      isEmailVerified: false,
      emailVerifyToken: '123456',
      emailVerifyTokenExpires: new Date(Date.now() + 60_000)
    })

    const response = await request(app)
      .post('/account/verify-email')
      .send({ email: account.email, otp: '654321' })
      .expect(422)

    expect(response.body.message).toBe('OTP is invalid or expired')
  })

  it('rejects an expired OTP', async () => {
    const account = await seedAccount({
      isEmailVerified: false,
      emailVerifyToken: '123456',
      emailVerifyTokenExpires: new Date(Date.now() - 1000)
    })

    await request(app).post('/account/verify-email').send({ email: account.email, otp: '123456' }).expect(422)
  })
})
