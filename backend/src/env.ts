// path: backend/src/env.ts
// Load environment variables from .env file
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env file from backend directory
config({ path: resolve(process.cwd(), '.env') })

export const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  PORT: process.env.PORT || '3001',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  SESSION_SECRET: process.env.SESSION_SECRET || 'your-secret-key',
  NODE_ENV: process.env.NODE_ENV || 'development',
} as const

