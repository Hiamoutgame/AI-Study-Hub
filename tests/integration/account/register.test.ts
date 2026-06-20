import request from 'supertest'
import app from '~/app'
import databaseService from '~/services/database.service'
import { createRegisterBody } from '../../helpers/factories'

describe('POST /account/register', () => {
  it('registers an account and persists its normalized email', async () => {
    const payload = createRegisterBody({ email: 'NEW.STUDENT@EXAMPLE.COM' })

    const response = await request(app).post('/account/register').send(payload).expect(201)

    expect(response.body).toMatchObject({ message: 'Register success' })
    const account = await databaseService.accounts.findOne({ email: 'new.student@example.com' })
    expect(account).toMatchObject({
      email: 'new.student@example.com',
      username: payload.username,
      isEmailVerified: false
    })
    expect(account?.passwordHash).not.toBe(payload.password)
    expect(account?.emailVerifyToken).toMatch(/^\d{6}$/)
  })

  it('rejects a duplicate email', async () => {
    const payload = createRegisterBody()
    await request(app).post('/account/register').send(payload).expect(201)

    const response = await request(app)
      .post('/account/register')
      .send({ ...createRegisterBody(), email: payload.email.toUpperCase() })
      .expect(422)

    expect(response.body.message).toBe('Email already exists')
  })

  it('returns field errors for an invalid body', async () => {
    const response = await request(app)
      .post('/account/register')
      .send({ username: '', email: 'not-an-email', password: 'weak', fullName: '' })
      .expect(422)

    expect(response.body).toMatchObject({ message: 'Validation Error' })
    expect(response.body.errors).toEqual(
      expect.objectContaining({ email: expect.any(Object), password: expect.any(Object), fullName: expect.any(Object) })
    )
  })
})
