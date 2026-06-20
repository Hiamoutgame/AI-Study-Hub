import request from 'supertest'
import app from '~/app'
import { seedAccount } from '../../helpers/db'

describe('POST /account/login', () => {
  it('logs in with a normalized email and returns an access token', async () => {
    await seedAccount({ email: 'login@example.com' })

    const response = await request(app)
      .post('/account/login')
      .send({ email: 'LOGIN@EXAMPLE.COM', password: 'Test@12345' })
      .expect(200)

    expect(response.body).toMatchObject({
      message: 'Login is success',
      data: {
        tokenType: 'Bearer',
        accessToken: expect.any(String),
        user: { email: 'login@example.com' }
      }
    })
  })

  it.each([
    ['a wrong password', { email: 'login@example.com', password: 'Wrong@12345' }],
    ['an unknown email', { email: 'missing@example.com', password: 'Test@12345' }]
  ])('rejects %s without leaking which credential failed', async (_label, payload) => {
    await seedAccount({ email: 'login@example.com' })

    const response = await request(app).post('/account/login').send(payload).expect(422)

    expect(response.body.message).toBe('Email or password is incorrect')
  })

  it('rejects an unverified account', async () => {
    await seedAccount({ email: 'unverified@example.com', isEmailVerified: false })

    const response = await request(app)
      .post('/account/login')
      .send({ email: 'unverified@example.com', password: 'Test@12345' })
      .expect(401)

    expect(response.body.message).toBe('User not verified')
  })
})
