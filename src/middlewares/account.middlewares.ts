import { checkSchema, ParamSchema } from 'express-validator'
import { JsonWebTokenError } from 'jsonwebtoken'
import { capitalize } from 'lodash'
import { TokenType } from '~/constants/enum'
import HTTP_STATUS from '~/constants/httpStatus'
import { ACCOUNT_MESSAGES } from '~/constants/message'
import { ErrorWithStatus } from '~/models/Error'
import { TokenPayLoad } from '~/models/request/account.request'
import { verifyToken } from '~/utils/jwt'
import { validate } from '~/utils/validation'

const usernameSchema: ParamSchema = {
  notEmpty: {
    errorMessage: ACCOUNT_MESSAGES.NAME_IS_REQUIRED
  },
  isString: {
    errorMessage: ACCOUNT_MESSAGES.NAME_MUST_BE_A_STRING
  },
  trim: true,
  isLength: {
    errorMessage: ACCOUNT_MESSAGES.NAME_LENGTH_MUST_BE_FROM_1_TO_100,
    options: { min: 1, max: 100 }
  }
}
const emailSchema: ParamSchema = {
  notEmpty: {
    errorMessage: ACCOUNT_MESSAGES.EMAIL_IS_REQUIRED
  },
  isEmail: {
    errorMessage: ACCOUNT_MESSAGES.EMAIL_IS_INVALID
  },
  trim: true
}
const passwordSchema: ParamSchema = {
  notEmpty: {
    errorMessage: ACCOUNT_MESSAGES.PASSWORD_IS_REQUIRED
  },
  isString: {
    errorMessage: ACCOUNT_MESSAGES.PASSWORD_MUST_BE_A_STRING
  },
  isLength: {
    options: {
      min: 8,
      max: 50
    },
    errorMessage: ACCOUNT_MESSAGES.PASSWORD_LENGTH_MUST_BE_FROM_8_TO_50
  },
  isStrongPassword: {
    options: {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
      // returnScore: false
      // false : chỉ return true nếu password mạnh, false nếu k
      // true : return về chất lượng password(trên thang điểm 10)
    },
    errorMessage: ACCOUNT_MESSAGES.PASSWORD_MUST_BE_STRONG
  }
}
const newPasswordSchema: ParamSchema = {
  ...passwordSchema
}
const confirmPasswordSchema: ParamSchema = {
  notEmpty: {
    errorMessage: ACCOUNT_MESSAGES.CONFIRM_PASSWORD_IS_REQUIRED
  },
  isString: {
    errorMessage: ACCOUNT_MESSAGES.CONFIRM_PASSWORD_MUST_BE_A_STRING
  },
  isLength: {
    options: {
      min: 8,
      max: 50
    },
    errorMessage: ACCOUNT_MESSAGES.CONFIRM_PASSWORD_LENGTH_MUST_BE_FROM_8_TO_50
  },
  isStrongPassword: {
    options: {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
    },
    errorMessage: ACCOUNT_MESSAGES.CONFIRM_PASSWORD_MUST_BE_STRONG
  },
  custom: {
    options: (value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error(ACCOUNT_MESSAGES.CONFIRM_PASSWORD_MUST_BE_THE_SAME_AS_PASSWORD)
      }
      return true
    }
  }
}
const fullNameSchema: ParamSchema = {
  notEmpty: {
    errorMessage: ACCOUNT_MESSAGES.NAME_IS_REQUIRED
  },
  isString: {
    errorMessage: ACCOUNT_MESSAGES.NAME_MUST_BE_A_STRING
  }
}
const otpSchema: ParamSchema = {
  trim: true,
  notEmpty: {
    errorMessage: ACCOUNT_MESSAGES.OTP_IS_REQUIRED
  },
  isLength: {
    options: { min: 6, max: 6 },
    errorMessage: ACCOUNT_MESSAGES.OTP_MUST_BE_6_DIGITS
  },
  isNumeric: {
    errorMessage: ACCOUNT_MESSAGES.OTP_MUST_BE_6_DIGITS
  }
}

export const registerValidator = validate(
  checkSchema({ username: usernameSchema, email: emailSchema, password: passwordSchema, fullName: fullNameSchema }, [
    'body'
  ])
)

export const emailVerifyOtpValidator = validate(checkSchema({ email: emailSchema, otp: otpSchema }, ['body']))

export const resendVerificationValidator = validate(checkSchema({ email: emailSchema }, ['body']))

export const loginValidator = validate(checkSchema({ email: emailSchema, password: passwordSchema }, ['body']))

export const accessTokenValidator = validate(
  checkSchema(
    {
      authorization: {
        notEmpty: {
          errorMessage: ACCOUNT_MESSAGES.ACCESS_TOKEN_IS_REQUIRED
        },
        custom: {
          options: async (value, { req }) => {
            const [tokenType, accessToken] = String(value).split(' ')
            if (tokenType !== 'Bearer' || !accessToken) {
              throw new ErrorWithStatus(ACCOUNT_MESSAGES.AUTHORIZATION_HEADER_IS_INVALID, HTTP_STATUS.UNAUTHORIZED)
            }

            try {
              const decodedAuthorization = await verifyToken({
                token: accessToken,
                privateKey: process.env.JWT_PRIVATE_KEY as string
              })

              if (decodedAuthorization.token_type !== TokenType.AccessToken) {
                throw new ErrorWithStatus(ACCOUNT_MESSAGES.ACCESS_TOKEN_IS_INVALID, HTTP_STATUS.UNAUTHORIZED)
              }

              req.decoded_authorization = decodedAuthorization as TokenPayLoad
              return true
            } catch (err) {
              if (err instanceof ErrorWithStatus) {
                throw err
              }
              if (err instanceof Error && err.message === ACCOUNT_MESSAGES.FORGOT_PASSWORD_TOKEN_IS_INVALID) {
                throw err
              }
              throw new ErrorWithStatus(capitalize((err as JsonWebTokenError).message), HTTP_STATUS.UNAUTHORIZED)
            }
          }
        }
      }
    },
    ['headers']
  )
)

export const forgotPasswordValidator = validate(checkSchema({ email: emailSchema }, ['body']))

export const resetPasswordValidator = validate(
  checkSchema(
    {
      email: emailSchema,
      otp: otpSchema,
      newPassword: newPasswordSchema,
      confirmPassword: confirmPasswordSchema
    },
    ['body']
  )
)
