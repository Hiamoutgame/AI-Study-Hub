import { TokenType } from '~/constants/enum'
import { signToken, verifyToken } from '~/utils/jwt'

describe('JWT helpers', () => {
  it('signs and verifies an access-token payload', async () => {
    const token = await signToken({
      payload: { user_id: '507f1f77bcf86cd799439011', token_type: TokenType.AccessToken },
      privateKey: process.env.JWT_PRIVATE_KEY as string,
      options: { expiresIn: 60 }
    })

    const decoded = await verifyToken({ token, privateKey: process.env.JWT_PRIVATE_KEY as string })

    expect(decoded).toMatchObject({
      user_id: '507f1f77bcf86cd799439011',
      token_type: TokenType.AccessToken
    })
  })

  it('rejects a token verified with another key', async () => {
    const token = await signToken({ payload: { user_id: '1' }, privateKey: 'correct-key' })

    await expect(verifyToken({ token, privateKey: 'wrong-key' })).rejects.toBeDefined()
  })
})
