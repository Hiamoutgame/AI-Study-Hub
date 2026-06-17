import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import { BOOKMARK_MESSAGES, SHARING_MESSAGES } from '~/constants/message'
import { TokenPayLoad } from '~/models/request/account.request'
import { AddBookmarkReqBody, CreateShareLinkReqBody, GetBookmarksQuery } from '~/models/request/sharing.request'
import sharingService from '~/services/sharing.service'

const getAccountId = (req: Request) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  return user_id
}

const getRequestContext = (req: Request) => ({
  ipAddress: req.ip,
  userAgent: req.get('user-agent')
})

export const addBookmarkController = async (req: Request<{ id: string }, any, AddBookmarkReqBody>, res: Response) => {
  const result = await sharingService.addBookmark({
    accountId: getAccountId(req),
    documentId: req.params.id,
    payload: req.body,
    context: getRequestContext(req)
  })

  return res.status(HTTP_STATUS.CREATED).json({ message: BOOKMARK_MESSAGES.ADD_BOOKMARK_SUCCESS, data: result })
}

export const removeBookmarkController = async (req: Request<{ id: string }>, res: Response) => {
  await sharingService.removeBookmark({
    accountId: getAccountId(req),
    documentId: req.params.id,
    context: getRequestContext(req)
  })

  return res.status(HTTP_STATUS.OK).json({ message: BOOKMARK_MESSAGES.REMOVE_BOOKMARK_SUCCESS, data: null })
}

export const getMyBookmarksController = async (
  req: Request<ParamsDictionary, any, any, GetBookmarksQuery>,
  res: Response
) => {
  const result = await sharingService.getMyBookmarks({
    accountId: getAccountId(req),
    query: req.query
  })

  return res.status(HTTP_STATUS.OK).json({ message: BOOKMARK_MESSAGES.GET_BOOKMARKS_SUCCESS, ...result })
}

export const createShareLinkController = async (
  req: Request<{ id: string }, any, CreateShareLinkReqBody>,
  res: Response
) => {
  const result = await sharingService.createShareLink({
    accountId: getAccountId(req),
    documentId: req.params.id,
    payload: req.body,
    context: getRequestContext(req)
  })

  return res.status(HTTP_STATUS.CREATED).json({ message: SHARING_MESSAGES.CREATE_SHARE_LINK_SUCCESS, data: result })
}

export const getShareLinksController = async (req: Request<{ id: string }>, res: Response) => {
  const result = await sharingService.getShareLinks({
    accountId: getAccountId(req),
    documentId: req.params.id
  })

  return res.status(HTTP_STATUS.OK).json({ message: SHARING_MESSAGES.GET_SHARE_LINKS_SUCCESS, data: result })
}

export const revokeShareLinkController = async (req: Request<{ id: string; shareId: string }>, res: Response) => {
  await sharingService.revokeShareLink({
    accountId: getAccountId(req),
    documentId: req.params.id,
    shareId: req.params.shareId,
    context: getRequestContext(req)
  })

  return res.status(HTTP_STATUS.OK).json({ message: SHARING_MESSAGES.REVOKE_SHARE_LINK_SUCCESS, data: null })
}

export const resolveSharedLinkController = async (req: Request<{ token: string }>, res: Response) => {
  const result = await sharingService.resolveSharedLink({
    token: req.params.token,
    context: getRequestContext(req)
  })

  return res.status(HTTP_STATUS.OK).json({ message: SHARING_MESSAGES.GET_SHARED_DOCUMENT_SUCCESS, data: result })
}
