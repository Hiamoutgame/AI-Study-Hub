import { JwtPayload } from 'jsonwebtoken'
import { TokenType } from '~/constants/enum'
import { ParsedQs } from 'qs'
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

export interface ResetPasswordReqBody {
  token: string
  newPassword: string
  confirmPassword: string
}

export interface TokenPayLoad extends JwtPayload {
  user_id: string
  token_type: TokenType
}
export interface EmailVerifyQuery extends ParsedQs {
  email_verify_token: string
}
