import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import { FOLDER_MESSAGES } from '~/constants/message'
import { TokenPayLoad } from '~/models/request/account.request'
import {
  CreateFolderReqBody,
  DeleteFolderReqBody,
  GetFolderContentsQuery,
  MoveFolderReqBody,
  UpdateFolderReqBody
} from '~/models/request/folder.request'
import folderService from '~/services/folder.service'

export const createFolderController = async (
  req: Request<ParamsDictionary, any, CreateFolderReqBody>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const result = await folderService.createFolder(user_id, req.body)
  return res.status(HTTP_STATUS.CREATED).json({ message: FOLDER_MESSAGES.FOLDER_CREATE_SUCCESS, data: result })
}

export const getFolderContentsController = async (
  req: Request<ParamsDictionary, any, any, GetFolderContentsQuery>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const result = await folderService.getFolderContents(user_id, req.query)
  return res.status(HTTP_STATUS.OK).json({ message: FOLDER_MESSAGES.FOLDER_LIST_SUCCESS, data: result })
}

export const getFolderBreadcrumbController = async (req: Request<{ id: string }>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const result = await folderService.getFolderBreadcrumb(user_id, req.params.id)
  return res.status(HTTP_STATUS.OK).json({ message: FOLDER_MESSAGES.FOLDER_DETAIL_SUCCESS, data: result })
}

export const updateFolderController = async (req: Request<{ id: string }, any, UpdateFolderReqBody>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const result = await folderService.renameFolder(user_id, req.params.id, req.body)
  return res.status(HTTP_STATUS.OK).json({ message: FOLDER_MESSAGES.FOLDER_UPDATE_SUCCESS, data: result })
}

export const moveFolderController = async (req: Request<{ id: string }, any, MoveFolderReqBody>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const result = await folderService.moveFolder(user_id, req.params.id, req.body)
  return res.status(HTTP_STATUS.OK).json({ message: FOLDER_MESSAGES.FOLDER_MOVE_SUCCESS, data: result })
}

export const deleteFolderController = async (req: Request<{ id: string }, any, DeleteFolderReqBody>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const result = await folderService.deleteFolder(user_id, req.params.id)
  return res.status(HTTP_STATUS.OK).json({ message: FOLDER_MESSAGES.CASCADE_DELETE_FOLDER_SUCCESS, data: result })
}
