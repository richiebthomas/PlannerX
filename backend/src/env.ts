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
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
  GOOGLE_WEBHOOK_URL: process.env.GOOGLE_WEBHOOK_URL,
} as const

