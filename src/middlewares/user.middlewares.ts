import { checkSchema, ParamSchema } from 'express-validator'
import { USER_MESSAGES } from '~/constants/message'
import { validate } from '~/utils/validation'

const optionalTextSchema = ({
  stringMessage,
  lengthMessage,
  min,
  max
}: {
  stringMessage: string
  lengthMessage: string
  min: number
  max: number
}): ParamSchema => ({
  optional: true,
  isString: {
    errorMessage: stringMessage
  },
  trim: true,
  isLength: {
    options: { min, max },
    errorMessage: lengthMessage
  }
})

const strongPasswordSchema = ({
  requiredMessage,
  stringMessage,
  lengthMessage,
  strongMessage
}: {
  requiredMessage: string
  stringMessage: string
  lengthMessage: string
  strongMessage: string
}): ParamSchema => ({
  notEmpty: {
    errorMessage: requiredMessage
  },
  isString: {
    errorMessage: stringMessage
  },
  isLength: {
    options: {
      min: 8,
      max: 50
    },
    errorMessage: lengthMessage
  },
  isStrongPassword: {
    options: {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
    },
    errorMessage: strongMessage
  }
})

export const updateProfileValidator = validate(
  checkSchema(
    {
      fullName: optionalTextSchema({
        stringMessage: USER_MESSAGES.FULL_NAME_MUST_BE_A_STRING,
        lengthMessage: USER_MESSAGES.FULL_NAME_LENGTH_MUST_BE_FROM_1_TO_100,
        min: 1,
        max: 100
      }),
      username: optionalTextSchema({
        stringMessage: USER_MESSAGES.USERNAME_MUST_BE_A_STRING,
        lengthMessage: USER_MESSAGES.USERNAME_LENGTH_MUST_BE_FROM_1_TO_100,
        min: 1,
        max: 100
      })
    },
    ['body']
  )
)

export const changePasswordValidator = validate(
  checkSchema(
    {
      currentPassword: {
        notEmpty: {
          errorMessage: USER_MESSAGES.CURRENT_PASSWORD_IS_REQUIRED
        },
        isString: {
          errorMessage: USER_MESSAGES.CURRENT_PASSWORD_MUST_BE_A_STRING
        }
      },
      newPassword: strongPasswordSchema({
        requiredMessage: USER_MESSAGES.NEW_PASSWORD_IS_REQUIRED,
        stringMessage: USER_MESSAGES.NEW_PASSWORD_MUST_BE_A_STRING,
        lengthMessage: USER_MESSAGES.NEW_PASSWORD_LENGTH_MUST_BE_FROM_8_TO_50,
        strongMessage: USER_MESSAGES.NEW_PASSWORD_MUST_BE_STRONG
      }),
      confirmPassword: {
        ...strongPasswordSchema({
          requiredMessage: USER_MESSAGES.CONFIRM_PASSWORD_IS_REQUIRED,
          stringMessage: USER_MESSAGES.CONFIRM_PASSWORD_MUST_BE_A_STRING,
          lengthMessage: USER_MESSAGES.CONFIRM_PASSWORD_LENGTH_MUST_BE_FROM_8_TO_50,
          strongMessage: USER_MESSAGES.CONFIRM_PASSWORD_MUST_BE_STRONG
        }),
        custom: {
          options: (value, { req }) => {
            if (value !== req.body.newPassword) {
              throw new Error(USER_MESSAGES.CONFIRM_PASSWORD_MUST_BE_THE_SAME_AS_NEW_PASSWORD)
            }
            return true
          }
        }
      }
    },
    ['body']
  )
)
