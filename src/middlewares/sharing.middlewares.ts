import { checkSchema, ParamSchema } from 'express-validator'
import { ObjectId } from 'mongodb'
import { PermissionLevel } from '~/constants/enum'
import { BOOKMARK_MESSAGES, SHARING_MESSAGES } from '~/constants/message'
import { validate } from '~/utils/validation'

const objectIdParamSchema = (errorMessage: string): ParamSchema => ({
  notEmpty: {
    errorMessage
  },
  custom: {
    options: (value) => {
      if (!ObjectId.isValid(value)) {
        throw new Error(errorMessage)
      }
      return true
    }
  }
})

const optionalBooleanSchema = (errorMessage: string): ParamSchema => ({
  optional: true,
  custom: {
    options: (value) => {
      if (typeof value === 'boolean' || value === 'true' || value === 'false') {
        return true
      }
      throw new Error(errorMessage)
    }
  }
})

const optionalNullablePositiveIntSchema = (errorMessage: string): ParamSchema => ({
  optional: { options: { nullable: true, checkFalsy: true } },
  isInt: {
    options: { min: 1 },
    errorMessage
  }
})

export const bookmarkNoteValidator = validate(
  checkSchema(
    {
      note: {
        optional: true,
        isString: {
          errorMessage: BOOKMARK_MESSAGES.NOTE_MUST_BE_A_STRING
        },
        trim: true,
        isLength: {
          options: { max: 300 },
          errorMessage: BOOKMARK_MESSAGES.NOTE_LENGTH_MUST_BE_LESS_THAN_300
        }
      }
    },
    ['body']
  )
)

export const getBookmarksValidator = validate(
  checkSchema(
    {
      page: {
        optional: true,
        isInt: {
          options: { min: 1 },
          errorMessage: BOOKMARK_MESSAGES.PAGE_MUST_BE_A_POSITIVE_INTEGER
        }
      },
      limit: {
        optional: true,
        isInt: {
          options: { min: 1, max: 100 },
          errorMessage: BOOKMARK_MESSAGES.LIMIT_MUST_BE_FROM_1_TO_100
        }
      }
    },
    ['query']
  )
)

export const shareIdValidator = validate(
  checkSchema(
    {
      shareId: objectIdParamSchema(SHARING_MESSAGES.SHARE_ID_IS_INVALID)
    },
    ['params']
  )
)

export const createShareLinkValidator = validate(
  checkSchema(
    {
      permissionLevel: {
        notEmpty: {
          errorMessage: SHARING_MESSAGES.PERMISSION_LEVEL_IS_REQUIRED
        },
        isIn: {
          options: [Object.values(PermissionLevel)],
          errorMessage: SHARING_MESSAGES.PERMISSION_LEVEL_IS_INVALID
        }
      },
      canDownload: optionalBooleanSchema(SHARING_MESSAGES.CAN_DOWNLOAD_MUST_BE_BOOLEAN),
      canComment: optionalBooleanSchema(SHARING_MESSAGES.CAN_COMMENT_MUST_BE_BOOLEAN),
      requiresLogin: optionalBooleanSchema(SHARING_MESSAGES.REQUIRES_LOGIN_MUST_BE_BOOLEAN),
      passwordHash: {
        optional: true,
        isString: {
          errorMessage: SHARING_MESSAGES.PASSWORD_HASH_MUST_BE_A_STRING
        },
        trim: true,
        isLength: {
          options: { max: 200 },
          errorMessage: SHARING_MESSAGES.PASSWORD_HASH_LENGTH_MUST_BE_LESS_THAN_200
        }
      },
      maxUses: optionalNullablePositiveIntSchema(SHARING_MESSAGES.MAX_USES_MUST_BE_A_POSITIVE_INTEGER),
      expiresInDays: {
        optional: { options: { nullable: true, checkFalsy: true } },
        isInt: {
          options: { min: 0 },
          errorMessage: SHARING_MESSAGES.EXPIRES_IN_DAYS_MUST_BE_A_NON_NEGATIVE_INTEGER
        }
      },
      note: {
        optional: true,
        isString: {
          errorMessage: SHARING_MESSAGES.NOTE_MUST_BE_A_STRING
        },
        trim: true,
        isLength: {
          options: { max: 300 },
          errorMessage: SHARING_MESSAGES.NOTE_LENGTH_MUST_BE_LESS_THAN_300
        }
      }
    },
    ['body']
  )
)

export const shareTokenValidator = validate(
  checkSchema(
    {
      token: {
        notEmpty: {
          errorMessage: SHARING_MESSAGES.SHARE_TOKEN_IS_REQUIRED
        },
        isString: {
          errorMessage: SHARING_MESSAGES.SHARE_TOKEN_MUST_BE_A_STRING
        },
        trim: true,
        isLength: {
          options: { max: 200 },
          errorMessage: SHARING_MESSAGES.SHARE_TOKEN_LENGTH_MUST_BE_LESS_THAN_200
        }
      }
    },
    ['params']
  )
)
