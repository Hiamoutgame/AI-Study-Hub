import { randomInt } from 'crypto'

// Sinh mã OTP gồm 6 chữ số (000000 - 999999)
export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0')
}
