import { hashPassword } from '~/utils/crypto'

describe('hashPassword', () => {
  it('is deterministic and does not return the plain password', () => {
    const password = 'Test@12345'

    expect(hashPassword(password)).toBe(hashPassword(password))
    expect(hashPassword(password)).not.toBe(password)
    expect(hashPassword(password)).toHaveLength(64)
  })

  it('changes when the password changes', () => {
    expect(hashPassword('Test@12345')).not.toBe(hashPassword('Other@12345'))
  })
})
