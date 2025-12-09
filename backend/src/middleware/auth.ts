// path: backend/src/middleware/auth.ts

import { Request, Response, NextFunction } from 'express'
import { verifyToken, JWTPayload } from '../lib/jwt.js'

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  try {
    // Get token from cookie
    const token = req.cookies.token

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    // Verify token
    const payload = verifyToken(token)
    
    // Attach user to request
    req.user = payload
    
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
