import { JwtPayload } from 'jsonwebtoken'
import { TokenType } from '~/constants/enum'
export interface RegisterReqBody {
  username: string
  email: string
  password: string
  fullName: string
}

export interface ResendVerificationReqBody {
  email: string
}

export interface LoginReqBody {
  email: string
  password: string
}

export interface ForgotPasswordReqBody {
  email: string
}

export interface VerifyEmailReqBody {
  email: string
  otp: string
}

export interface ResetPasswordReqBody {
  email: string
  otp: string
  newPassword: string
  confirmPassword: string
}

export interface TokenPayLoad extends JwtPayload {
  user_id: string
  token_type: TokenType
}
