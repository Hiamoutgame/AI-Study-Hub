import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import HTTP_STATUS from '~/constants/httpStatus'
import { ADMIN_MESSAGES, CATEGORY_MESSAGES, NOTIFICATION_MESSAGES } from '~/constants/message'
import { TokenPayLoad } from '~/models/request/account.request'
import {
  AdminDeleteDocumentReqBody,
  AdminDocumentsQuery,
  AdminUsersQuery,
  DashboardQuery,
  DeleteUserReqBody,
  FlagDocumentReqBody,
  StatsQuery,
  UpdateUserRoleReqBody,
  UpdateUserStatusReqBody,
  UpdateUserStorageQuotaReqBody
} from '~/models/request/admin.request'
import { CreateCategoryReqBody, DeleteCategoryQuery, UpdateCategoryReqBody } from '~/models/request/category.request'
import { GetAdminNotificationsQuery, SendNotificationReqBody } from '~/models/request/notification.request'
import adminDashboardService from '~/services/adminDashboard.service'
import adminDocumentService from '~/services/adminDocument.service'
import adminUserService from '~/services/adminUser.service'
import categoryService from '~/services/category.service'
import notificationService from '~/services/notification.service'

const getAdminId = (req: Request) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  return user_id
}

export const getAdminUsersController = async (
  req: Request<ParamsDictionary, any, any, AdminUsersQuery>,
  res: Response
) => {
  const result = await adminUserService.getUsers(req.query)
  return res.status(HTTP_STATUS.OK).json({ message: ADMIN_MESSAGES.GET_USERS_SUCCESS, ...result })
}

export const getAdminUserDetailController = async (req: Request<{ id: string }>, res: Response) => {
  const result = await adminUserService.getUserDetail(req.params.id)
  return res.status(HTTP_STATUS.OK).json({ message: ADMIN_MESSAGES.GET_USER_DETAIL_SUCCESS, data: result })
}

export const updateAdminUserStatusController = async (
  req: Request<{ id: string }, any, UpdateUserStatusReqBody>,
  res: Response
) => {
  const result = await adminUserService.updateUserStatus({
    adminId: getAdminId(req),
    targetId: req.params.id,
    payload: req.body
  })
  return res.status(HTTP_STATUS.OK).json({ message: ADMIN_MESSAGES.UPDATE_USER_STATUS_SUCCESS, data: result })
}

export const updateAdminUserRoleController = async (
  req: Request<{ id: string }, any, UpdateUserRoleReqBody>,
  res: Response
) => {
  const result = await adminUserService.updateUserRole({
    adminId: getAdminId(req),
    targetId: req.params.id,
    payload: req.body
  })
  return res.status(HTTP_STATUS.OK).json({ message: ADMIN_MESSAGES.UPDATE_USER_ROLE_SUCCESS, data: result })
}

export const updateAdminUserStorageQuotaController = async (
  req: Request<{ id: string }, any, UpdateUserStorageQuotaReqBody>,
  res: Response
) => {
  const result = await adminUserService.updateUserStorageQuota({
    adminId: getAdminId(req),
    targetId: req.params.id,
    payload: req.body
  })
  return res.status(HTTP_STATUS.OK).json({ message: ADMIN_MESSAGES.UPDATE_USER_STORAGE_QUOTA_SUCCESS, data: result })
}

export const deleteAdminUserController = async (
  req: Request<{ id: string }, any, DeleteUserReqBody>,
  res: Response
) => {
  const result = await adminUserService.deleteUser({
    adminId: getAdminId(req),
    targetId: req.params.id,
    payload: req.body
  })
  return res.status(HTTP_STATUS.OK).json({ message: ADMIN_MESSAGES.DELETE_USER_SUCCESS, data: result })
}

export const getAdminDocumentsController = async (
  req: Request<ParamsDictionary, any, any, AdminDocumentsQuery>,
  res: Response
) => {
  const result = await adminDocumentService.getDocuments(req.query)
  return res.status(HTTP_STATUS.OK).json({ message: ADMIN_MESSAGES.GET_ADMIN_DOCUMENTS_SUCCESS, ...result })
}

export const deleteAdminDocumentController = async (
  req: Request<{ id: string }, any, AdminDeleteDocumentReqBody>,
  res: Response
) => {
  const result = await adminDocumentService.deleteDocument({
    adminId: getAdminId(req),
    documentId: req.params.id,
    payload: req.body
  })
  return res.status(HTTP_STATUS.OK).json({ message: ADMIN_MESSAGES.DELETE_ADMIN_DOCUMENT_SUCCESS, data: result })
}

export const flagAdminDocumentController = async (
  req: Request<{ id: string }, any, FlagDocumentReqBody>,
  res: Response
) => {
  const result = await adminDocumentService.flagDocument({
    adminId: getAdminId(req),
    documentId: req.params.id,
    payload: req.body
  })
  return res.status(HTTP_STATUS.OK).json({ message: ADMIN_MESSAGES.FLAG_DOCUMENT_SUCCESS, data: result })
}

export const createAdminCategoryController = async (
  req: Request<ParamsDictionary, any, CreateCategoryReqBody>,
  res: Response
) => {
  const result = await categoryService.createCategory({ adminId: getAdminId(req), payload: req.body })
  return res.status(HTTP_STATUS.CREATED).json({ message: CATEGORY_MESSAGES.CREATE_CATEGORY_SUCCESS, data: result })
}

export const updateAdminCategoryController = async (
  req: Request<{ id: string }, any, UpdateCategoryReqBody>,
  res: Response
) => {
  const result = await categoryService.updateCategory({
    adminId: getAdminId(req),
    categoryId: req.params.id,
    payload: req.body
  })
  return res.status(HTTP_STATUS.OK).json({ message: CATEGORY_MESSAGES.UPDATE_CATEGORY_SUCCESS, data: result })
}

export const deleteAdminCategoryController = async (
  req: Request<{ id: string }, any, any, DeleteCategoryQuery>,
  res: Response
) => {
  const result = await categoryService.deleteCategory({
    adminId: getAdminId(req),
    categoryId: req.params.id,
    query: req.query
  })
  return res.status(HTTP_STATUS.OK).json({ message: CATEGORY_MESSAGES.DELETE_CATEGORY_SUCCESS, data: result })
}

export const sendAdminNotificationController = async (
  req: Request<ParamsDictionary, any, SendNotificationReqBody>,
  res: Response
) => {
  const result = await notificationService.sendNotification({ adminId: getAdminId(req), payload: req.body })
  return res
    .status(HTTP_STATUS.CREATED)
    .json({ message: NOTIFICATION_MESSAGES.SEND_NOTIFICATION_SUCCESS, data: result })
}

export const getAdminNotificationsController = async (
  req: Request<ParamsDictionary, any, any, GetAdminNotificationsQuery>,
  res: Response
) => {
  const result = await notificationService.getAdminNotifications(req.query)
  return res.status(HTTP_STATUS.OK).json({ message: NOTIFICATION_MESSAGES.GET_ADMIN_NOTIFICATIONS_SUCCESS, ...result })
}

export const getAdminDashboardController = async (
  req: Request<ParamsDictionary, any, any, DashboardQuery>,
  res: Response
) => {
  const result = await adminDashboardService.getDashboard(req.query)
  return res.status(HTTP_STATUS.OK).json({ message: ADMIN_MESSAGES.GET_DASHBOARD_SUCCESS, data: result })
}

export const getAdminUserStatsController = async (
  req: Request<ParamsDictionary, any, any, StatsQuery>,
  res: Response
) => {
  const result = await adminDashboardService.getUserStats(req.query)
  return res.status(HTTP_STATUS.OK).json({ message: ADMIN_MESSAGES.GET_USER_STATS_SUCCESS, data: result })
}

export const getAdminDocumentStatsController = async (
  req: Request<ParamsDictionary, any, any, StatsQuery>,
  res: Response
) => {
  const result = await adminDashboardService.getDocumentStats(req.query)
  return res.status(HTTP_STATUS.OK).json({ message: ADMIN_MESSAGES.GET_DOCUMENT_STATS_SUCCESS, data: result })
}
