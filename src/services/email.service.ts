import nodemailer, { Transporter } from 'nodemailer'
import { EMAIL_FROM, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_USER } from '~/constants/base'
import { ErrorWithStatus } from '~/models/Error'

class EmailService {
  private transporter: Transporter | undefined

  // Chỉ tạo transporter khi đã cấu hình đủ SMTP; nếu thiếu sẽ fallback log OTP ra console (dev).
  private getTransporter(): Transporter | undefined {
    if (this.transporter) {
      return this.transporter
    }

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      return this.transporter
    }

    this.transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    })

    return this.transporter
  }

  private async send({ to, subject, html }: { to: string; subject: string; html: string }) {
    const transporter = this.getTransporter()

    if (!transporter) {
      console.log(`[EmailService] SMTP chưa cấu hình. Email tới ${to} - ${subject}\n${html}`)
      return
    }

    await transporter.sendMail({ from: EMAIL_FROM, to, subject, html })
  }

  async sendVerifyEmailOtp(email: string, otp: string, expiresInMinutes: number) {
    await this.send({
      to: email,
      subject: 'AI Study Hub - Mã xác thực email',
      html: `
        <p>Mã xác thực email của bạn là:</p>
        <h2 style="letter-spacing:4px">${otp}</h2>
        <p>Mã có hiệu lực trong ${expiresInMinutes} phút.</p>
      `
    })
  }

  async sendForgotPasswordOtp(email: string, otp: string, expiresInMinutes: number) {
    await this.send({
      to: email,
      subject: 'AI Study Hub - Mã đặt lại mật khẩu',
      html: `
        <p>Mã đặt lại mật khẩu của bạn là:</p>
        <h2 style="letter-spacing:4px">${otp}</h2>
        <p>Mã có hiệu lực trong ${expiresInMinutes} phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
      `
    })
  }
}

const emailService = new EmailService()

export default emailService
