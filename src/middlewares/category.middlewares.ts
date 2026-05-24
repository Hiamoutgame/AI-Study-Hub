import { checkSchema, ParamSchema } from 'express-validator'
import { ObjectId } from 'mongodb'
import { SolutionCategoryType } from '~/constants/enum'
import { CATEGORY_MESSAGES } from '~/constants/message'
import { validate } from '~/utils/validation'

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

const categoryIdSchema: ParamSchema = {
  notEmpty: {
    errorMessage: CATEGORY_MESSAGES.CATEGORY_ID_IS_INVALID
  },
  custom: {
    options: (value) => {
      if (!ObjectId.isValid(value)) {
        throw new Error(CATEGORY_MESSAGES.CATEGORY_ID_IS_INVALID)
      }
      return true
    }
  }
}

const nameSchema: ParamSchema = {
  notEmpty: {
    errorMessage: CATEGORY_MESSAGES.NAME_IS_REQUIRED
  },
  isString: {
    errorMessage: CATEGORY_MESSAGES.NAME_MUST_BE_A_STRING
  },
  trim: true,
  isLength: {
    options: { min: 1, max: 100 },
    errorMessage: CATEGORY_MESSAGES.NAME_LENGTH_MUST_BE_FROM_1_TO_100
  }
}

const optionalNameSchema: ParamSchema = {
  optional: true,
  ...nameSchema
}

const slugSchema: ParamSchema = {
  notEmpty: {
    errorMessage: CATEGORY_MESSAGES.SLUG_IS_REQUIRED
  },
  isString: {
    errorMessage: CATEGORY_MESSAGES.SLUG_MUST_BE_A_STRING
  },
  trim: true,
  matches: {
    options: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    errorMessage: CATEGORY_MESSAGES.SLUG_IS_INVALID
  }
}

const optionalSlugSchema: ParamSchema = {
  optional: true,
  ...slugSchema
}

const commonCategorySchemas = {
  description: {
    optional: true,
    isString: {
      errorMessage: CATEGORY_MESSAGES.DESCRIPTION_MUST_BE_A_STRING
    },
    trim: true
  },
  icon: {
    optional: true,
    isString: {
      errorMessage: CATEGORY_MESSAGES.ICON_MUST_BE_A_STRING
    },
    trim: true
  },
  color: {
    optional: true,
    matches: {
      options: /^#[0-9A-Fa-f]{6}$/,
      errorMessage: CATEGORY_MESSAGES.COLOR_IS_INVALID
    }
  },
  type: {
    optional: true,
    isIn: {
      options: [Object.values(SolutionCategoryType)],
      errorMessage: CATEGORY_MESSAGES.TYPE_IS_INVALID
    }
  },
  parentId: optionalObjectId(CATEGORY_MESSAGES.PARENT_ID_IS_INVALID),
  acceptedExtensions: {
    optional: true,
    isArray: {
      errorMessage: CATEGORY_MESSAGES.ACCEPTED_EXTENSIONS_MUST_BE_AN_ARRAY
    },
    custom: {
      options: (value: unknown) => {
        if (!Array.isArray(value) || value.every((item) => typeof item === 'string')) {
          return true
        }
        throw new Error(CATEGORY_MESSAGES.ACCEPTED_EXTENSIONS_MUST_BE_AN_ARRAY)
      }
    }
  },
  sortOrder: {
    optional: true,
    isInt: {
      errorMessage: CATEGORY_MESSAGES.SORT_ORDER_MUST_BE_AN_INTEGER
    }
  }
}

export const categoryIdValidator = validate(checkSchema({ id: categoryIdSchema }, ['params']))

export const getCategoriesValidator = validate(
  checkSchema(
    {
      parentId: {
        optional: true,
        custom: {
          options: (value) => {
            if (value === 'null' || ObjectId.isValid(value)) {
              return true
            }
            throw new Error(CATEGORY_MESSAGES.PARENT_ID_IS_INVALID)
          }
        }
      },
      type: {
        optional: true,
        isIn: {
          options: [Object.values(SolutionCategoryType)],
          errorMessage: CATEGORY_MESSAGES.TYPE_IS_INVALID
        }
      },
      isActive: optionalBoolean(CATEGORY_MESSAGES.IS_ACTIVE_MUST_BE_BOOLEAN)
    },
    ['query']
  )
)

export const createCategoryValidator = validate(
  checkSchema(
    {
      name: nameSchema,
      slug: slugSchema,
      ...commonCategorySchemas
    },
    ['body']
  )
)

export const updateCategoryValidator = validate(
  checkSchema(
    {
      name: optionalNameSchema,
      slug: optionalSlugSchema,
      ...commonCategorySchemas,
      isActive: optionalBoolean(CATEGORY_MESSAGES.IS_ACTIVE_MUST_BE_BOOLEAN)
    },
    ['body']
  )
)

export const deleteCategoryValidator = validate(
  checkSchema(
    {
      migrateTo: optionalObjectId(CATEGORY_MESSAGES.CATEGORY_ID_IS_INVALID)
    },
    ['query']
  )
)
