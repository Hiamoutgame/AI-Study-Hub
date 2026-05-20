import HTTP_STATUS from '~/constants/httpStatus'

type ErrorType = Record<string, { msg: string; [key: string]: any }>

export class ErrorWithStatus {
  message: string
  status: number
  constructor(message: string, status: number) {
    this.message = message
    this.status = status
  }
}

export class EntityErr extends ErrorWithStatus {
  errors: ErrorType
  constructor({ message = 'Validation Error', errors }: { message?: string; errors: ErrorType }) {
    super(message, HTTP_STATUS.UNPROCESSABLE_ENTITY)
    this.errors = errors
  }
}
