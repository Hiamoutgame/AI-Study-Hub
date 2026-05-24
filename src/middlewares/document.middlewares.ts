import { checkSchema, ParamSchema } from 'express-validator'
import { ObjectId } from 'mongodb'
import { AiStatus } from '~/constants/enum'
import { DOCUMENT_MESSAGES } from '~/constants/message'
import { validate } from '~/utils/validation'

const optionalObjectIdSchema = (errorMessage: string): ParamSchema => ({
  optional: true,
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

const optionalBooleanSchema = (errorMessage: string): ParamSchema => ({
  optional: true,
  custom: {
    options: (value) => {
      if (typeof value === 'boolean') {
        return true
      }
      if (value === 'true' || value === 'false') {
        return true
      }
      throw new Error(errorMessage)
    }
  }
})

const optionalTagsSchema: ParamSchema = {
  optional: true,
  custom: {
    options: (value) => {
      if (Array.isArray(value)) {
        return value.every((tag) => typeof tag === 'string')
      }
      if (typeof value === 'string') {
        return true
      }
      throw new Error(DOCUMENT_MESSAGES.TAGS_MUST_BE_AN_ARRAY_OR_STRING)
    }
  }
}

const titleSchema: ParamSchema = {
  notEmpty: {
    errorMessage: DOCUMENT_MESSAGES.TITLE_IS_REQUIRED
  },
  isString: {
    errorMessage: DOCUMENT_MESSAGES.TITLE_MUST_BE_A_STRING
  },
  trim: true,
  isLength: {
    options: { min: 1, max: 200 },
    errorMessage: DOCUMENT_MESSAGES.TITLE_LENGTH_MUST_BE_FROM_1_TO_200
  }
}

const optionalTitleSchema: ParamSchema = {
  optional: true,
  isString: {
    errorMessage: DOCUMENT_MESSAGES.TITLE_MUST_BE_A_STRING
  },
  trim: true,
  isLength: {
    options: { min: 1, max: 200 },
    errorMessage: DOCUMENT_MESSAGES.TITLE_LENGTH_MUST_BE_FROM_1_TO_200
  }
}

const optionalDescriptionSchema: ParamSchema = {
  optional: true,
  isString: {
    errorMessage: DOCUMENT_MESSAGES.DESCRIPTION_MUST_BE_A_STRING
  },
  trim: true,
  isLength: {
    options: { max: 1000 },
    errorMessage: DOCUMENT_MESSAGES.DESCRIPTION_LENGTH_MUST_BE_LESS_THAN_1000
  }
}

const optionalLanguageSchema: ParamSchema = {
  optional: true,
  isString: {
    errorMessage: DOCUMENT_MESSAGES.LANGUAGE_MUST_BE_A_STRING
  },
  trim: true,
  isLength: {
    options: { min: 2, max: 20 },
    errorMessage: DOCUMENT_MESSAGES.LANGUAGE_LENGTH_MUST_BE_FROM_2_TO_20
  }
}

export const uploadDocumentValidator = validate(
  checkSchema(
    {
      title: titleSchema,
      description: optionalDescriptionSchema,
      categoryId: optionalObjectIdSchema(DOCUMENT_MESSAGES.CATEGORY_ID_IS_INVALID),
      tags: optionalTagsSchema,
      language: optionalLanguageSchema,
      isPublic: optionalBooleanSchema(DOCUMENT_MESSAGES.IS_PUBLIC_MUST_BE_BOOLEAN),
      enableOcr: optionalBooleanSchema(DOCUMENT_MESSAGES.ENABLE_OCR_MUST_BE_BOOLEAN)
    },
    ['body']
  )
)

export const getDocumentsValidator = validate(
  checkSchema(
    {
      q: {
        optional: true,
        isString: true,
        trim: true
      },
      categoryId: optionalObjectIdSchema(DOCUMENT_MESSAGES.CATEGORY_ID_IS_INVALID),
      tags: {
        optional: true,
        isString: {
          errorMessage: DOCUMENT_MESSAGES.TAGS_MUST_BE_AN_ARRAY_OR_STRING
        },
        trim: true
      },
      isPublic: optionalBooleanSchema(DOCUMENT_MESSAGES.IS_PUBLIC_MUST_BE_BOOLEAN),
      aiStatus: {
        optional: true,
        isIn: {
          options: [Object.values(AiStatus)],
          errorMessage: DOCUMENT_MESSAGES.AI_STATUS_IS_INVALID
        }
      },
      sortBy: {
        optional: true,
        isIn: {
          options: [['createdAt', 'title', 'fileSizeBytes']],
          errorMessage: DOCUMENT_MESSAGES.SORT_BY_IS_INVALID
        }
      },
      order: {
        optional: true,
        isIn: {
          options: [['asc', 'desc']],
          errorMessage: DOCUMENT_MESSAGES.ORDER_IS_INVALID
        }
      },
      page: {
        optional: true,
        isInt: {
          options: { min: 1 },
          errorMessage: DOCUMENT_MESSAGES.PAGE_MUST_BE_A_POSITIVE_INTEGER
        }
      },
      limit: {
        optional: true,
        isInt: {
          options: { min: 1, max: 100 },
          errorMessage: DOCUMENT_MESSAGES.LIMIT_MUST_BE_FROM_1_TO_100
        }
      }
    },
    ['query']
  )
)

export const documentIdValidator = validate(
  checkSchema(
    {
      id: {
        notEmpty: {
          errorMessage: DOCUMENT_MESSAGES.DOCUMENT_ID_IS_INVALID
        },
        custom: {
          options: (value) => {
            if (!ObjectId.isValid(value)) {
              throw new Error(DOCUMENT_MESSAGES.DOCUMENT_ID_IS_INVALID)
            }
            return true
          }
        }
      }
    },
    ['params']
  )
)

export const updateDocumentValidator = validate(
  checkSchema(
    {
      title: optionalTitleSchema,
      description: optionalDescriptionSchema,
      categoryId: optionalObjectIdSchema(DOCUMENT_MESSAGES.CATEGORY_ID_IS_INVALID),
      tags: optionalTagsSchema,
      isPublic: optionalBooleanSchema(DOCUMENT_MESSAGES.IS_PUBLIC_MUST_BE_BOOLEAN),
      language: optionalLanguageSchema
    },
    ['body']
  )
)
