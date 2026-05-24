import { Request } from 'express'
import { Account } from './models/Account.schema'
import { TokenPayLoad } from './models/request/account.request'
declare module 'express' {
  interface Request {
    decoded_authorization?: TokenPayLoad
    decoded_refresh_Token?: TokenPayLoad
    decoded_email_verify_Token?: TokenPayLoad
    decoded_forgot_password_token?: TokenPayLoad
    adminAccount?: Account
  }
}
