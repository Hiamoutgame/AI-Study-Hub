import { generateOtp } from '~/utils/otp'

describe('generateOtp', () => {
  it('always returns six numeric characters', () => {
    for (let index = 0; index < 100; index += 1) {
      expect(generateOtp()).toMatch(/^\d{6}$/)
    }
  })
})
