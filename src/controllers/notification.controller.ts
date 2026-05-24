import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import { NOTIFICATION_MESSAGES } from '~/constants/message'
import { TokenPayLoad } from '~/models/request/account.request'
import { GetMyNotificationsQuery } from '~/models/request/notification.request'
import notificationService from '~/services/notification.service'

export const getMyNotificationsController = async (
  req: Request<ParamsDictionary, any, any, GetMyNotificationsQuery>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const result = await notificationService.getMyNotifications({ accountId: user_id, query: req.query })
  return res.status(HTTP_STATUS.OK).json({ message: NOTIFICATION_MESSAGES.GET_NOTIFICATIONS_SUCCESS, ...result })
}

export const markMyNotificationReadController = async (req: Request<{ id: string }>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const result = await notificationService.markRead({ accountId: user_id, notificationId: req.params.id })
  return res
    .status(HTTP_STATUS.OK)
    .json({ message: NOTIFICATION_MESSAGES.MARK_NOTIFICATION_READ_SUCCESS, data: result })
}
