import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import { CATEGORY_MESSAGES } from '~/constants/message'
import { GetCategoriesQuery } from '~/models/request/category.request'
import categoryService from '~/services/category.service'

export const getCategoriesController = async (
  req: Request<ParamsDictionary, any, any, GetCategoriesQuery>,
  res: Response
) => {
  const result = await categoryService.getCategories(req.query)
  return res.status(HTTP_STATUS.OK).json({ message: CATEGORY_MESSAGES.GET_CATEGORIES_SUCCESS, data: result })
}
