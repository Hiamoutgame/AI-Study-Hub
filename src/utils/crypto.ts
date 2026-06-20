import { createHash } from 'crypto'
import dotenv from 'dotenv'
dotenv.config({ quiet: true })

function sha256(content: string) {
  return createHash('sha256').update(content).digest('hex')
}
export function hashPassword(password: string): string {
  // Implement your hashing logic here, e.g., using bcrypt
  return sha256(password + process.env.PASSWORD_SECRET) // Replace with actual hashed password
}
