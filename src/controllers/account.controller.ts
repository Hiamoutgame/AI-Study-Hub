import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import { ACCOUNT_MESSAGES } from '~/constants/message'
import { ErrorWithStatus } from '~/models/Error'
import {
  ForgotPasswordReqBody,
  LoginReqBody,
  RegisterReqBody,
  ResendVerificationReqBody,
  ResetPasswordReqBody,
  VerifyEmailReqBody
} from '~/models/request/account.request'
import accountService from '~/services/account.service'

export const registerController = async (req: Request<ParamsDictionary, any, RegisterReqBody>, res: Response) => {
  const { email } = req.body
  const isEmailExist = await accountService.checkEmailExist(email)
  if (isEmailExist) {
    throw new ErrorWithStatus(ACCOUNT_MESSAGES.EMAIL_ALREADY_EXISTS, HTTP_STATUS.UNPROCESSABLE_ENTITY)
  }
  const account = await accountService.register(req.body)
  return res.status(HTTP_STATUS.CREATED).json({ message: ACCOUNT_MESSAGES.REGISTER_SUCCESS, account: account })
}

export const emailVerifyController = async (req: Request<ParamsDictionary, any, VerifyEmailReqBody>, res: Response) => {
  const { email, otp } = req.body

  await accountService.verifyEmailByOtp({ email, otp })
  return res.status(HTTP_STATUS.OK).json({ message: ACCOUNT_MESSAGES.EMAIL_VERIFY_SUCCESS })
}

export const resendVerificationController = async (
  req: Request<ParamsDictionary, any, ResendVerificationReqBody>,
  res: Response
) => {
  await accountService.resendVerification(req.body.email)
  return res.status(HTTP_STATUS.OK).json({ message: ACCOUNT_MESSAGES.RESEND_VERIFY_EMAIL_SUCCESS })
}

export const loginController = async (req: Request<ParamsDictionary, any, LoginReqBody>, res: Response) => {
  const result = await accountService.login(req.body)
  return res.status(HTTP_STATUS.OK).json({ message: ACCOUNT_MESSAGES.LOGIN_SUCCESS, data: result })
}

export const logoutController = async (req: Request, res: Response) => {
  return res.status(HTTP_STATUS.OK).json({ message: ACCOUNT_MESSAGES.LOGOUT_SUCCESS })
}

export const forgotPasswordController = async (
  req: Request<ParamsDictionary, any, ForgotPasswordReqBody>,
  res: Response
) => {
  await accountService.forgotPassword(req.body.email)
  return res.status(HTTP_STATUS.OK).json({ message: ACCOUNT_MESSAGES.RESET_PASSWORD_EMAIL_SENT })
}

export const resetPasswordController = async (
  req: Request<ParamsDictionary, any, ResetPasswordReqBody>,
  res: Response
) => {
  const { email, otp, newPassword } = req.body
  await accountService.resetPassword({ email, otp, newPassword })
  return res.status(HTTP_STATUS.OK).json({ message: ACCOUNT_MESSAGES.RESET_PASSWORD_SUCCESS })
}
