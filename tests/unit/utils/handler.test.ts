import { NextFunction, Request, Response } from 'express'
import { wrapAsync } from '~/utils/handler'

describe('wrapAsync', () => {
  it('forwards an async error to next', async () => {
    const error = new Error('controller failed')
    const next = jest.fn() as NextFunction
    const handler = wrapAsync(async () => {
      throw error
    })

    await handler({} as Request, {} as Response, next)

    expect(next).toHaveBeenCalledWith(error)
  })
})
