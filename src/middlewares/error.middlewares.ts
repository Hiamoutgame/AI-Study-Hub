import { NextFunction, Request, Response } from 'express'
import { omit } from 'lodash'
import HTTP_STATUS from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/Error'

export const defautHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  //Hệ thống đổ về rất nhiều lỗi

  //Nếu lỗi có dạng ErrorWithStatus
  if (err instanceof ErrorWithStatus) {
    return res.status(err.status).json(omit(err, 'status'))
  }
  //nếu lỗi có dạng error bitnh thường hoặc khác
  //thì mình nên mở các enumberable ra
  Object.getOwnPropertyNames(err).forEach((key) => {
    Object.defineProperty(err, key, { enumerable: true })
  })
  return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    message: err.message,
    errorInfo: omit(err, ['stack'])
  })
}
