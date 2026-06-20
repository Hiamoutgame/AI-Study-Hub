import { TokenType, UserRole } from '~/constants/enum'
import { AccountType } from '~/models/Account.schema'
import { signToken } from '~/utils/jwt'

export const createAccessToken = (account: Pick<AccountType, '_id' | 'email' | 'role'>) => {
  if (!account._id) {
    throw new Error('Test account must have an _id before creating an access token')
  }

  return signToken({
    payload: {
      user_id: account._id.toString(),
      email: account.email,
      role: account.role || UserRole.user,
      token_type: TokenType.AccessToken
    },
    privateKey: process.env.JWT_PRIVATE_KEY as string,
    options: { algorithm: 'HS256', expiresIn: 3600 }
  })
}

export const createAuthHeader = async (account: Pick<AccountType, '_id' | 'email' | 'role'>) =>
  `Bearer ${await createAccessToken(account)}`
