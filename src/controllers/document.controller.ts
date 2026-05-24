import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import { DOCUMENT_MESSAGES } from '~/constants/message'
import { TokenPayLoad } from '~/models/request/account.request'
import { GetDocumentsQuery, UpdateDocumentReqBody, UploadDocumentReqBody } from '~/models/request/document.request'
import documentService from '~/services/document.service'

export const uploadDocumentController = async (
  req: Request<ParamsDictionary, any, UploadDocumentReqBody>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const result = await documentService.uploadDocument({
    accountId: user_id,
    payload: req.body,
    file: req.file,
    context: {
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    }
  })

  return res.status(HTTP_STATUS.CREATED).json({ message: DOCUMENT_MESSAGES.UPLOAD_DOCUMENT_SUCCESS, data: result })
}

export const getDocumentsController = async (
  req: Request<ParamsDictionary, any, any, GetDocumentsQuery>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const result = await documentService.getDocuments({
    accountId: user_id,
    query: req.query
  })

  return res
    .status(HTTP_STATUS.OK)
    .json({ message: DOCUMENT_MESSAGES.GET_DOCUMENTS_SUCCESS, data: result.data, meta: result.meta })
}

export const getDocumentDetailController = async (req: Request<{ id: string }>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const result = await documentService.getDocumentDetail({
    accountId: user_id,
    documentId: req.params.id,
    context: {
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    }
  })

  return res.status(HTTP_STATUS.OK).json({ message: DOCUMENT_MESSAGES.GET_DOCUMENT_DETAIL_SUCCESS, data: result })
}

export const updateDocumentController = async (
  req: Request<{ id: string }, any, UpdateDocumentReqBody>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const result = await documentService.updateDocument({
    accountId: user_id,
    documentId: req.params.id,
    payload: req.body,
    context: {
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    }
  })

  return res.status(HTTP_STATUS.OK).json({ message: DOCUMENT_MESSAGES.UPDATE_DOCUMENT_SUCCESS, data: result })
}
