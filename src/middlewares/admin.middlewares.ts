import { NextFunction, Request, Response } from 'express'
import { checkSchema, ParamSchema } from 'express-validator'
import { ObjectId } from 'mongodb'
import { AiStatus, ExtractionStatus, SolutionStatus, StoragePlan, UserRole } from '~/constants/enum'
import HTTP_STATUS from '~/constants/httpStatus'
import { ADMIN_MESSAGES } from '~/constants/message'
import { ErrorWithStatus } from '~/models/Error'
import { TokenPayLoad } from '~/models/request/account.request'
import databaseService from '~/services/database.service'
import { validate } from '~/utils/validation'

const objectIdParam = (field: string, message: string): ParamSchema => ({
  notEmpty: {
    errorMessage: message
  },
  custom: {
    options: (value) => {
      if (!ObjectId.isValid(value)) {
        throw new Error(message)
      }
      return true
    }
  }
})

const optionalObjectId = (message: string): ParamSchema => ({
  optional: true,
  trim: true,
  custom: {
    options: (value) => {
      if (!ObjectId.isValid(value)) {
        throw new Error(message)
      }
      return true
    }
  }
})

const optionalBoolean = (message: string): ParamSchema => ({
  optional: true,
  custom: {
    options: (value) => {
      if (typeof value === 'boolean' || value === 'true' || value === 'false') {
        return true
      }
      throw new Error(message)
    }
  }
})

const requiredReason: ParamSchema = {
  notEmpty: {
    errorMessage: ADMIN_MESSAGES.REASON_IS_REQUIRED
  },
  isString: {
    errorMessage: ADMIN_MESSAGES.REASON_MUST_BE_A_STRING
  },
  trim: true
}

const optionalReason: ParamSchema = {
  optional: true,
  isString: {
    errorMessage: ADMIN_MESSAGES.REASON_MUST_BE_A_STRING
  },
  trim: true
}

const paginationSchema = {
  page: {
    optional: true,
    isInt: {
      options: { min: 1 },
      errorMessage: 'Page must be a positive integer'
    }
  },
  limit: {
    optional: true,
    isInt: {
      options: { min: 1, max: 100 },
      errorMessage: 'Limit must be from 1 to 100'
    }
  }
}

export const adminRoleValidator = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayLoad
  const admin = await databaseService.accounts.findOne({ _id: new ObjectId(user_id) })

  if (!admin) {
    return next(new ErrorWithStatus(ADMIN_MESSAGES.ADMIN_NOT_FOUND, HTTP_STATUS.NOT_FOUND))
  }

  if (!admin.isActive) {
    return next(new ErrorWithStatus(ADMIN_MESSAGES.ADMIN_IS_INACTIVE, HTTP_STATUS.UNAUTHORIZED))
  }

  if (!admin.isEmailVerified) {
    return next(new ErrorWithStatus(ADMIN_MESSAGES.ADMIN_NOT_VERIFIED, HTTP_STATUS.FORBIDDEN))
  }

  if (admin.role !== UserRole.admin) {
    return next(new ErrorWithStatus(ADMIN_MESSAGES.ADMIN_ROLE_REQUIRED, HTTP_STATUS.FORBIDDEN))
  }

  req.adminAccount = admin
  return next()
}

export const adminUserIdValidator = validate(
  checkSchema({ id: objectIdParam('id', ADMIN_MESSAGES.USER_ID_IS_INVALID) }, ['params'])
)

export const getAdminUsersValidator = validate(
  checkSchema(
    {
      q: {
        optional: true,
        isString: true,
        trim: true
      },
      role: {
        optional: true,
        isIn: {
          options: [Object.values(UserRole)],
          errorMessage: ADMIN_MESSAGES.ROLE_IS_INVALID
        }
      },
      status: {
        optional: true,
        isIn: {
          options: [['active', 'locked', 'unverified']],
          errorMessage: ADMIN_MESSAGES.STATUS_IS_INVALID
        }
      },
      plan: {
        optional: true,
        isIn: {
          options: [Object.values(StoragePlan)],
          errorMessage: ADMIN_MESSAGES.STORAGE_PLAN_IS_INVALID
        }
      },
      sortBy: {
        optional: true,
        isIn: {
          options: [['createdAt', 'fullName', 'lastLoginAt']],
          errorMessage: ADMIN_MESSAGES.STATUS_IS_INVALID
        }
      },
      order: {
        optional: true,
        isIn: {
          options: [['asc', 'desc']],
          errorMessage: ADMIN_MESSAGES.STATUS_IS_INVALID
        }
      },
      ...paginationSchema
    },
    ['query']
  )
)

export const updateUserStatusValidator = validate(
  checkSchema(
    {
      isActive: {
        notEmpty: {
          errorMessage: ADMIN_MESSAGES.IS_ACTIVE_MUST_BE_BOOLEAN
        },
        isBoolean: {
          errorMessage: ADMIN_MESSAGES.IS_ACTIVE_MUST_BE_BOOLEAN
        }
      },
      reason: optionalReason
    },
    ['body']
  )
)

export const updateUserRoleValidator = validate(
  checkSchema(
    {
      role: {
        notEmpty: {
          errorMessage: ADMIN_MESSAGES.ROLE_IS_INVALID
        },
        isIn: {
          options: [Object.values(UserRole)],
          errorMessage: ADMIN_MESSAGES.ROLE_IS_INVALID
        }
      }
    },
    ['body']
  )
)

export const updateUserStorageQuotaValidator = validate(
  checkSchema(
    {
      plan: {
        optional: true,
        isIn: {
          options: [Object.values(StoragePlan)],
          errorMessage: ADMIN_MESSAGES.STORAGE_PLAN_IS_INVALID
        }
      },
      totalBytes: {
        optional: true,
        isInt: {
          options: { min: 0 },
          errorMessage: ADMIN_MESSAGES.TOTAL_BYTES_MUST_BE_A_NON_NEGATIVE_INTEGER
        }
      },
      maxFileSizeBytes: {
        optional: true,
        isInt: {
          options: { min: 0 },
          errorMessage: ADMIN_MESSAGES.MAX_FILE_SIZE_BYTES_MUST_BE_A_NON_NEGATIVE_INTEGER
        }
      },
      aiQueriesLimit: {
        optional: true,
        isInt: {
          errorMessage: ADMIN_MESSAGES.AI_QUERIES_LIMIT_MUST_BE_AN_INTEGER
        }
      }
    },
    ['body']
  )
)

export const deleteUserValidator = validate(checkSchema({ reason: optionalReason }, ['body']))

export const getAdminDocumentsValidator = validate(
  checkSchema(
    {
      q: {
        optional: true,
        isString: true,
        trim: true
      },
      uploaderId: optionalObjectId(ADMIN_MESSAGES.USER_ID_IS_INVALID),
      categoryId: optionalObjectId(ADMIN_MESSAGES.USER_ID_IS_INVALID),
      isPublic: optionalBoolean(ADMIN_MESSAGES.IS_ACTIVE_MUST_BE_BOOLEAN),
      extractionStatus: {
        optional: true,
        isIn: {
          options: [Object.values(ExtractionStatus)],
          errorMessage: ADMIN_MESSAGES.STATUS_IS_INVALID
        }
      },
      aiStatus: {
        optional: true,
        isIn: {
          options: [Object.values(AiStatus)],
          errorMessage: ADMIN_MESSAGES.STATUS_IS_INVALID
        }
      },
      status: {
        optional: true,
        isIn: {
          options: [Object.values(SolutionStatus)],
          errorMessage: ADMIN_MESSAGES.STATUS_IS_INVALID
        }
      },
      flagged: optionalBoolean(ADMIN_MESSAGES.FLAGGED_MUST_BE_BOOLEAN),
      ...paginationSchema
    },
    ['query']
  )
)

export const adminDocumentIdValidator = validate(
  checkSchema({ id: objectIdParam('id', ADMIN_MESSAGES.USER_ID_IS_INVALID) }, ['params'])
)

export const adminDeleteDocumentValidator = validate(
  checkSchema(
    {
      reason: requiredReason,
      notifyUser: optionalBoolean(ADMIN_MESSAGES.NOTIFY_USER_MUST_BE_BOOLEAN)
    },
    ['body']
  )
)

export const flagDocumentValidator = validate(
  checkSchema(
    {
      reason: requiredReason,
      category: {
        optional: true,
        isIn: {
          options: [['copyright', 'inappropriate', 'spam', 'other']],
          errorMessage: ADMIN_MESSAGES.FLAG_CATEGORY_IS_INVALID
        }
      }
    },
    ['body']
  )
)

export const dashboardQueryValidator = validate(
  checkSchema(
    {
      period: {
        optional: true,
        isIn: {
          options: [['today', 'week', 'month', 'year']],
          errorMessage: ADMIN_MESSAGES.PERIOD_IS_INVALID
        }
      }
    },
    ['query']
  )
)

export const statsQueryValidator = validate(
  checkSchema(
    {
      from: {
        optional: true,
        isISO8601: {
          errorMessage: ADMIN_MESSAGES.DATE_IS_INVALID
        }
      },
      to: {
        optional: true,
        isISO8601: {
          errorMessage: ADMIN_MESSAGES.DATE_IS_INVALID
        }
      },
      groupBy: {
        optional: true,
        isIn: {
          options: [['day', 'week', 'month']],
          errorMessage: ADMIN_MESSAGES.GROUP_BY_IS_INVALID
        }
      }
    },
    ['query']
  )
)
