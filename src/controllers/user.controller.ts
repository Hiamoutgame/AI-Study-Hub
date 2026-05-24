import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import { USER_MESSAGES } from '~/constants/message'
import { TokenPayLoad } from '~/models/request/account.request'
import { ChangePasswordReqBody, UpdateProfileReqBody } from '~/models/request/user.request'
import userService from '~/services/user.service'

export const getProfileController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const result = await userService.getProfile(user_id)

  return res.status(HTTP_STATUS.OK).json({ message: USER_MESSAGES.GET_PROFILE_SUCCESS, data: result })
}

export const getStorageController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const result = await userService.getStorage(user_id)

  return res.status(HTTP_STATUS.OK).json({ message: USER_MESSAGES.GET_STORAGE_SUCCESS, data: result })
}

export const updateProfileController = async (
  req: Request<ParamsDictionary, any, UpdateProfileReqBody>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const result = await userService.updateProfile({
    accountId: user_id,
    payload: req.body,
    avatar: req.file
  })

  return res.status(HTTP_STATUS.OK).json({ message: USER_MESSAGES.UPDATE_PROFILE_SUCCESS, data: result })
}

export const changePasswordController = async (
  req: Request<ParamsDictionary, any, ChangePasswordReqBody>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  await userService.changePassword({
    accountId: user_id,
    payload: req.body
  })

  return res.status(HTTP_STATUS.OK).json({ message: USER_MESSAGES.CHANGE_PASSWORD_SUCCESS, data: null })
}
