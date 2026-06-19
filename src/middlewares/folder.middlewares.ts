import { checkSchema, ParamSchema } from 'express-validator'
import { ObjectId } from 'mongodb'
import { FOLDER_MESSAGES } from '~/constants/message'
import { validate } from '~/utils/validation'

const folderNameSchema: ParamSchema = {
  notEmpty: {
    errorMessage: FOLDER_MESSAGES.FOLDER_NAME_IS_REQUIRED
  },
  isString: {
    errorMessage: FOLDER_MESSAGES.FOLDER_NAME_MUST_BE_A_STRING
  },
  trim: true,
  isLength: {
    options: { min: 1, max: 120 },
    errorMessage: FOLDER_MESSAGES.FOLDER_NAME_LENGTH_MUST_BE_FROM_1_TO_120
  }
}

const nullableObjectIdSchema = (errorMessage: string): ParamSchema => ({
  optional: { options: { nullable: true, checkFalsy: true } },
  trim: true,
  custom: {
    options: (value) => {
      if (!ObjectId.isValid(value)) {
        throw new Error(errorMessage)
      }
      return true
    }
  }
})

export const createFolderValidator = validate(
  checkSchema(
    {
      name: folderNameSchema,
      parentId: nullableObjectIdSchema(FOLDER_MESSAGES.PARENT_FOLDER_ID_IS_INVALID)
    },
    ['body']
  )
)

export const folderIdValidator = validate(
  checkSchema(
    {
      id: {
        notEmpty: {
          errorMessage: FOLDER_MESSAGES.FOLDER_ID_IS_INVALID
        },
        custom: {
          options: (value) => {
            if (!ObjectId.isValid(value)) {
              throw new Error(FOLDER_MESSAGES.FOLDER_ID_IS_INVALID)
            }
            return true
          }
        }
      }
    },
    ['params']
  )
)

export const updateFolderValidator = validate(checkSchema({ name: folderNameSchema }, ['body']))

export const moveFolderValidator = validate(
  checkSchema(
    {
      parentId: nullableObjectIdSchema(FOLDER_MESSAGES.PARENT_FOLDER_ID_IS_INVALID)
    },
    ['body']
  )
)

export const getFolderContentsValidator = validate(
  checkSchema(
    {
      folderId: nullableObjectIdSchema(FOLDER_MESSAGES.FOLDER_ID_IS_INVALID),
      q: {
        optional: true,
        isString: {
          errorMessage: FOLDER_MESSAGES.FOLDER_NAME_MUST_BE_A_STRING
        },
        trim: true,
        isLength: {
          options: { max: 200 },
          errorMessage: FOLDER_MESSAGES.FOLDER_SEARCH_LENGTH_MUST_BE_LESS_THAN_200
        }
      },
      sortBy: {
        optional: true,
        isIn: {
          options: [['createdAt', 'updatedAt', 'name']],
          errorMessage: FOLDER_MESSAGES.SORT_BY_IS_INVALID
        }
      },
      order: {
        optional: true,
        isIn: {
          options: [['asc', 'desc']],
          errorMessage: FOLDER_MESSAGES.ORDER_IS_INVALID
        }
      }
    },
    ['query']
  )
)

export const deleteFolderValidator = validate(
  checkSchema(
    {
      confirm: {
        custom: {
          options: (value) => {
            if (value !== true && value !== 'true') {
              throw new Error(FOLDER_MESSAGES.DELETE_CONFIRMATION_IS_REQUIRED)
            }
            return true
          }
        }
      }
    },
    ['body']
  )
)
