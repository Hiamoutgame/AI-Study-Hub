import { checkSchema, ParamSchema } from 'express-validator'
import { ObjectId } from 'mongodb'
import { NotificationPriority, NotificationRefEntity, NotificationType } from '~/constants/enum'
import { NOTIFICATION_MESSAGES } from '~/constants/message'
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

const notificationIdSchema: ParamSchema = {
  notEmpty: {
    errorMessage: NOTIFICATION_MESSAGES.NOTIFICATION_ID_IS_INVALID
  },
  custom: {
    options: (value) => {
      if (!ObjectId.isValid(value)) {
        throw new Error(NOTIFICATION_MESSAGES.NOTIFICATION_ID_IS_INVALID)
      }
      return true
    }
  }
}

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

export const notificationIdValidator = validate(checkSchema({ id: notificationIdSchema }, ['params']))

export const sendNotificationValidator = validate(
  checkSchema(
    {
      title: {
        notEmpty: {
          errorMessage: NOTIFICATION_MESSAGES.TITLE_IS_REQUIRED
        },
        isString: {
          errorMessage: NOTIFICATION_MESSAGES.TITLE_MUST_BE_A_STRING
        },
        trim: true,
        isLength: {
          options: { min: 1, max: 300 },
          errorMessage: NOTIFICATION_MESSAGES.TITLE_LENGTH_MUST_BE_FROM_1_TO_300
        }
      },
      body: {
        notEmpty: {
          errorMessage: NOTIFICATION_MESSAGES.BODY_IS_REQUIRED
        },
        isString: {
          errorMessage: NOTIFICATION_MESSAGES.BODY_MUST_BE_A_STRING
        },
        trim: true
      },
      type: {
        isIn: {
          options: [Object.values(NotificationType)],
          errorMessage: NOTIFICATION_MESSAGES.TYPE_IS_INVALID
        }
      },
      priority: {
        optional: true,
        isIn: {
          options: [Object.values(NotificationPriority)],
          errorMessage: NOTIFICATION_MESSAGES.PRIORITY_IS_INVALID
        }
      },
      target: {
        isIn: {
          options: [['all', 'recipientIds']],
          errorMessage: NOTIFICATION_MESSAGES.TARGET_IS_INVALID
        }
      },
      recipientIds: {
        optional: true,
        isArray: {
          errorMessage: NOTIFICATION_MESSAGES.RECIPIENT_IDS_MUST_BE_AN_ARRAY
        },
        custom: {
          options: (value, { req }) => {
            if (req.body.target !== 'recipientIds') {
              return true
            }
            if (!Array.isArray(value) || value.length === 0) {
              throw new Error(NOTIFICATION_MESSAGES.RECIPIENT_IDS_ARE_REQUIRED)
            }
            if (!value.every((id) => typeof id === 'string' && ObjectId.isValid(id))) {
              throw new Error(NOTIFICATION_MESSAGES.RECIPIENT_IDS_MUST_BE_AN_ARRAY)
            }
            return true
          }
        }
      },
      refEntity: {
        optional: true,
        isIn: {
          options: [Object.values(NotificationRefEntity)],
          errorMessage: NOTIFICATION_MESSAGES.REF_ENTITY_IS_INVALID
        }
      },
      refEntityId: optionalObjectId(NOTIFICATION_MESSAGES.REF_ENTITY_ID_IS_INVALID),
      actionUrl: {
        optional: true,
        isString: {
          errorMessage: NOTIFICATION_MESSAGES.ACTION_URL_MUST_BE_A_STRING
        },
        trim: true
      },
      sendEmail: optionalBoolean(NOTIFICATION_MESSAGES.SEND_EMAIL_MUST_BE_BOOLEAN)
    },
    ['body']
  )
)

export const getAdminNotificationsValidator = validate(
  checkSchema(
    {
      type: {
        optional: true,
        isIn: {
          options: [Object.values(NotificationType)],
          errorMessage: NOTIFICATION_MESSAGES.TYPE_IS_INVALID
        }
      },
      senderId: optionalObjectId(NOTIFICATION_MESSAGES.RECIPIENT_IDS_MUST_BE_AN_ARRAY),
      sourceEventId: {
        optional: true,
        isString: true,
        trim: true
      },
      ...paginationSchema
    },
    ['query']
  )
)

export const getMyNotificationsValidator = validate(
  checkSchema(
    {
      isRead: optionalBoolean(NOTIFICATION_MESSAGES.IS_READ_MUST_BE_BOOLEAN),
      type: {
        optional: true,
        isIn: {
          options: [Object.values(NotificationType)],
          errorMessage: NOTIFICATION_MESSAGES.TYPE_IS_INVALID
        }
      },
      ...paginationSchema
    },
    ['query']
  )
)
