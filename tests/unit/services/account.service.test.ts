import { ObjectId } from 'mongodb'
import HTTP_STATUS from '~/constants/httpStatus'
import { ACCOUNT_MESSAGES } from '~/constants/message'
import accountService from '~/services/account.service'
import databaseService from '~/services/database.service'
import emailService from '~/services/email.service'
import { hashPassword } from '~/utils/crypto'
import { createAccount, createRegisterBody } from '../../helpers/factories'

jest.mock('~/services/database.service', () => ({
  __esModule: true,
  default: {
    accounts: {
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn()
    }
  }
}))

jest.mock('~/services/email.service', () => ({
  __esModule: true,
  default: {
    sendVerifyEmailOtp: jest.fn(),
    sendForgotPasswordOtp: jest.fn()
  }
}))

jest.mock('~/utils/otp', () => ({
  generateOtp: () => '123456'
}))

const mockAccounts = jest.mocked(databaseService.accounts)
const mockEmailService = jest.mocked(emailService)
const updateResult = { acknowledged: true, matchedCount: 1, modifiedCount: 1, upsertedCount: 0, upsertedId: null }

describe('AccountService', () => {
  beforeEach(() => {
    mockAccounts.findOne.mockReset()
    mockAccounts.insertOne.mockReset()
    mockAccounts.updateOne.mockReset()
    mockEmailService.sendVerifyEmailOtp.mockReset().mockResolvedValue(undefined)
    mockEmailService.sendForgotPasswordOtp.mockReset().mockResolvedValue(undefined)
  })

  it('normalizes email before checking whether it exists', async () => {
    mockAccounts.findOne.mockResolvedValue(null)

    await expect(accountService.checkEmailExist('  STUDENT@EXAMPLE.COM ')).resolves.toBe(false)
    expect(mockAccounts.findOne).toHaveBeenCalledWith({ email: 'student@example.com' })
  })

  it('registers a normalized account with a hashed password and sends an OTP', async () => {
    const payload = createRegisterBody({ email: '  NEW@EXAMPLE.COM ' })
    const insertResult = { acknowledged: true, insertedId: new ObjectId() }
    mockAccounts.insertOne.mockResolvedValue(insertResult)

    await expect(accountService.register(payload)).resolves.toBe(insertResult)

    const insertedAccount = mockAccounts.insertOne.mock.calls[0][0]
    expect(insertedAccount).toMatchObject({
      email: 'new@example.com',
      emailVerifyToken: '123456',
      isEmailVerified: false,
      passwordHash: hashPassword(payload.password)
    })
    expect(mockEmailService.sendVerifyEmailOtp).toHaveBeenCalledWith(payload.email, '123456', 10)
  })

  it('rejects login when the credentials are incorrect', async () => {
    mockAccounts.findOne.mockResolvedValue(null)

    await expect(accountService.login({ email: 'missing@example.com', password: 'Test@12345' })).rejects.toMatchObject({
      message: ACCOUNT_MESSAGES.EMAIL_OR_PASSWORD_IS_INCORRECT,
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY
    })
  })

  it('logs in a verified active account and updates lastLoginAt', async () => {
    const account = createAccount({ email: 'login@example.com' })
    mockAccounts.findOne.mockResolvedValue(account)
    mockAccounts.updateOne.mockResolvedValue(updateResult)

    const result = await accountService.login({ email: ' LOGIN@EXAMPLE.COM ', password: 'Test@12345' })

    expect(result).toMatchObject({ tokenType: 'Bearer', user: { email: 'login@example.com' } })
    expect(result.accessToken).toEqual(expect.any(String))
    expect(mockAccounts.updateOne).toHaveBeenCalledWith(
      { _id: account._id },
      { $set: { lastLoginAt: expect.any(Date) } }
    )
  })

  it('rejects an expired email verification OTP', async () => {
    mockAccounts.findOne.mockResolvedValue(
      createAccount({
        isEmailVerified: false,
        emailVerifyToken: '123456',
        emailVerifyTokenExpires: new Date(Date.now() - 1000)
      })
    )

    await expect(
      accountService.verifyEmailByOtp({ email: 'account@example.com', otp: '123456' })
    ).rejects.toMatchObject({
      message: ACCOUNT_MESSAGES.OTP_IS_INVALID_OR_EXPIRED,
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY
    })
  })

  it('does not reveal whether a forgot-password email exists', async () => {
    mockAccounts.findOne.mockResolvedValue(null)

    await expect(accountService.forgotPassword('missing@example.com')).resolves.toBe(false)
    expect(mockEmailService.sendForgotPasswordOtp).not.toHaveBeenCalled()
  })

  it('resets a password only for a valid, unexpired OTP record', async () => {
    const account = createAccount({ resetPasswordToken: '123456' })
    mockAccounts.findOne.mockResolvedValue(account)
    mockAccounts.updateOne.mockResolvedValue(updateResult)

    await accountService.resetPassword({ email: account.email, otp: '123456', newPassword: 'New@12345' })

    expect(mockAccounts.findOne).toHaveBeenCalledWith({
      email: account.email,
      resetPasswordToken: '123456',
      resetPasswordExpires: { $gt: expect.any(Date) }
    })
    expect(mockAccounts.updateOne).toHaveBeenCalledWith(
      { _id: account._id },
      {
        $set: expect.objectContaining({
          passwordHash: hashPassword('New@12345'),
          resetPasswordToken: ''
        })
      }
    )
  })
})
