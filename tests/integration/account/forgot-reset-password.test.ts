import request from 'supertest'
import app from '~/app'
import databaseService from '~/services/database.service'
import { hashPassword } from '~/utils/crypto'
import { seedAccount } from '../../helpers/db'

describe('forgot and reset password flow', () => {
  it('stores a reset OTP for an existing account', async () => {
    const account = await seedAccount({ email: 'forgot@example.com' })

    await request(app).post('/account/forgot-password').send({ email: account.email }).expect(200)

    const updated = await databaseService.accounts.findOne({ _id: account._id })
    expect(updated?.resetPasswordToken).toMatch(/^\d{6}$/)
    expect(updated?.resetPasswordExpires.getTime()).toBeGreaterThan(Date.now())
  })

  it('returns the same success response for an unknown account', async () => {
    const response = await request(app)
      .post('/account/forgot-password')
      .send({ email: 'missing@example.com' })
      .expect(200)

    expect(response.body.message).toBe('Reset password email has been sent if the account exists')
  })

  it('resets the password with a valid OTP', async () => {
    const account = await seedAccount({
      email: 'reset@example.com',
      resetPasswordToken: '123456',
      resetPasswordExpires: new Date(Date.now() + 60_000)
    })

    await request(app)
      .post('/account/reset-password')
      .send({
        email: account.email,
        otp: '123456',
        newPassword: 'NewPass@123',
        confirmPassword: 'NewPass@123'
      })
      .expect(200)

    const updated = await databaseService.accounts.findOne({ _id: account._id })
    expect(updated).toMatchObject({
      passwordHash: hashPassword('NewPass@123'),
      resetPasswordToken: ''
    })
  })

  it('rejects an invalid or expired reset OTP', async () => {
    const account = await seedAccount({
      resetPasswordToken: '123456',
      resetPasswordExpires: new Date(Date.now() - 1000)
    })

    await request(app)
      .post('/account/reset-password')
      .send({
        email: account.email,
        otp: '123456',
        newPassword: 'NewPass@123',
        confirmPassword: 'NewPass@123'
      })
      .expect(422)
  })
})
