import { NextFunction, Request, RequestHandler, Response } from 'express'
// hàm nhận vào controller | hoặc middlewares async
// và biến  chúng nó thảnh controller và middleware có cấu trúc try catch next
export const wrapAsync = <P, T>(fn: RequestHandler<P, any, any, T>) => {
  return async (req: Request<P, any, any, T>, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next)
    } catch (err) {
      next(err)
    }
  }
}
