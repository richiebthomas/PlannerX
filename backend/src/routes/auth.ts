// path: backend/src/routes/auth.ts

import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticateToken } from '../middleware/auth.js'
import { generateToken } from '../lib/jwt.js'
import { env } from '../env.js'

const router = Router()

// Cookie options for cross-site requests
const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: (env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
}

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').optional(),
})

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

const updateProfileSchema = z.object({
  name: z.string().optional(),
  timezone: z.string().optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  defaultView: z.enum(['day', 'week', 'month', 'agenda']).optional(),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
})

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const result = registerSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message })
    }

    const { email, password, name } = result.data

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
      },
    })

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    })

    // Set JWT in HTTP-only cookie
    res.cookie('token', token, cookieOptions)

    // Create default categories
    await prisma.category.createMany({
      data: [
        { userId: user.id, name: 'Work', color: '#3B82F6' },
        { userId: user.id, name: 'Personal', color: '#10B981' },
        { userId: user.id, name: 'Health', color: '#EF4444' },
        { userId: user.id, name: 'Study', color: '#8B5CF6' },
      ],
    })

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
        theme: user.theme,
        defaultView: user.defaultView,
      },
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: 'Failed to register' })
  }
})

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const result = loginSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message })
    }

    const { email, password } = result.data

    // Find user
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.passwordHash)
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    })

    // Set JWT in HTTP-only cookie
    res.cookie('token', token, cookieOptions)

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
        theme: user.theme,
        defaultView: user.defaultView,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Failed to login' })
  }
})

// Logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    // Clear JWT cookie
    res.clearCookie('token', cookieOptions)
    
    res.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: 'Failed to logout' })
  }
})

// Get current user
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
        theme: user.theme,
        defaultView: user.defaultView,
      },
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ error: 'Failed to get user' })
  }
})

// Update profile
router.patch('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = updateProfileSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message })
    }

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: result.data,
    })

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
        theme: user.theme,
        defaultView: user.defaultView,
      },
    })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

// Change password
router.post('/change-password', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = changePasswordSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message })
    }

    const { currentPassword, newPassword } = result.data

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({ error: 'Failed to change password' })
  }
})

export default router
