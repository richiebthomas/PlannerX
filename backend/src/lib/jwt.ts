// path: backend/src/lib/jwt.ts

import jwt from 'jsonwebtoken'
import { env } from '../env.js'

export interface JWTPayload {
  userId: string
  email: string
}

const JWT_SECRET = env.SESSION_SECRET // Reusing SESSION_SECRET as JWT_SECRET
const JWT_EXPIRES_IN = '30d' // 30 days

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  })
}

export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return decoded
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

