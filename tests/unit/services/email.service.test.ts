describe('EmailService', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    jest.resetModules()
    jest.dontMock('nodemailer')
  })

  it('falls back to console output when SMTP is not configured', async () => {
    process.env.SMTP_HOST = ''
    process.env.SMTP_USER = ''
    process.env.SMTP_PASS = ''
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    const { default: emailService } = await import('~/services/email.service')

    await emailService.sendVerifyEmailOtp('student@example.com', '123456', 10)

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('student@example.com'))
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('123456'))
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Mã xác thực email'))
  })

  it('uses a mocked Nodemailer transporter and sends the intended reset email', async () => {
    const sendMail = jest.fn().mockResolvedValue(undefined)
    const createTransport = jest.fn(() => ({ sendMail }))
    jest.doMock('nodemailer', () => ({
      __esModule: true,
      default: { createTransport }
    }))
    process.env.SMTP_HOST = 'smtp.test.local'
    process.env.SMTP_PORT = '2525'
    process.env.SMTP_USER = 'smtp-user'
    process.env.SMTP_PASS = 'smtp-pass'
    process.env.EMAIL_FROM = 'no-reply@example.com'
    const { default: emailService } = await import('~/services/email.service')

    await emailService.sendForgotPasswordOtp('student@example.com', '654321', 15)

    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp.test.local',
      port: 2525,
      secure: false,
      auth: { user: 'smtp-user', pass: 'smtp-pass' }
    })
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'no-reply@example.com',
        to: 'student@example.com',
        subject: 'AI Study Hub - Mã đặt lại mật khẩu',
        html: expect.stringContaining('654321')
      })
    )
  })
})
