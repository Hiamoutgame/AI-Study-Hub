import { clearTestDatabase, cleanupTestUploads, connectTestDatabase, disconnectTestDatabase } from '../helpers/db'

jest.mock('~/services/email.service', () => ({
  __esModule: true,
  default: {
    sendVerifyEmailOtp: jest.fn().mockResolvedValue(undefined),
    sendForgotPasswordOtp: jest.fn().mockResolvedValue(undefined)
  }
}))

beforeAll(async () => {
  await connectTestDatabase()
})

beforeEach(async () => {
  await clearTestDatabase()
  await cleanupTestUploads()
})

afterAll(async () => {
  await clearTestDatabase()
  await cleanupTestUploads()
  await disconnectTestDatabase()
})
