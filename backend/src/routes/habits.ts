// path: backend/src/routes/habits.ts

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

router.use(authenticateToken)

const habitSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
  targetDays: z.array(z.number().int().min(0).max(6)).optional(), // 0 = Sunday
  targetCount: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
})

const habitLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  completed: z.boolean().optional(),
  count: z.number().int().positive().optional(),
  note: z.string().optional(),
})

// Get all habits
router.get('/', async (req: Request, res: Response) => {
  try {
    const { active } = req.query
    
    const where: any = { userId: req.user!.userId }
    if (active === 'true') where.isActive = true
    if (active === 'false') where.isActive = false

    const habits = await prisma.habit.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    })

    res.json(habits)
  } catch (error) {
    console.error('Get habits error:', error)
    res.status(500).json({ error: 'Failed to get habits' })
  }
})

// Get habit with logs for date range
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query

    const habit = await prisma.habit.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
      include: {
        logs: startDate && endDate ? {
          where: {
            date: {
              gte: new Date(startDate as string),
              lte: new Date(endDate as string),
            },
          },
          orderBy: { date: 'asc' },
        } : {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    })

    if (!habit) {
      return res.status(404).json({ error: 'Habit not found' })
    }

    res.json(habit)
  } catch (error) {
    console.error('Get habit error:', error)
    res.status(500).json({ error: 'Failed to get habit' })
  }
})

// Get habit logs for a date range (all habits)
router.get('/logs/range', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' })
    }

    const logs = await prisma.habitLog.findMany({
      where: {
        userId: req.user!.userId,
        date: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        },
      },
      include: {
        habit: true,
      },
      orderBy: { date: 'asc' },
    })

    res.json(logs)
  } catch (error) {
    console.error('Get habit logs error:', error)
    res.status(500).json({ error: 'Failed to get habit logs' })
  }
})

// Create habit
router.post('/', async (req: Request, res: Response) => {
  try {
    const result = habitSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message })
    }

    const habit = await prisma.habit.create({
      data: {
        userId: req.user!.userId,
        name: result.data.name,
        description: result.data.description,
        color: result.data.color,
        icon: result.data.icon,
        frequency: result.data.frequency,
        targetDays: result.data.targetDays,
        targetCount: result.data.targetCount,
        isActive: result.data.isActive,
      },
    })

    res.status(201).json(habit)
  } catch (error) {
    console.error('Create habit error:', error)
    res.status(500).json({ error: 'Failed to create habit' })
  }
})

// Update habit
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const result = habitSchema.partial().safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message })
    }

    const existing = await prisma.habit.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Habit not found' })
    }

    const habit = await prisma.habit.update({
      where: { id: req.params.id },
      data: result.data,
    })

    res.json(habit)
  } catch (error) {
    console.error('Update habit error:', error)
    res.status(500).json({ error: 'Failed to update habit' })
  }
})

// Delete habit
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await prisma.habit.deleteMany({
      where: { id: req.params.id, userId: req.user!.userId },
    })

    if (result.count === 0) {
      return res.status(404).json({ error: 'Habit not found' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Delete habit error:', error)
    res.status(500).json({ error: 'Failed to delete habit' })
  }
})

// Log habit completion
router.post('/:id/log', async (req: Request, res: Response) => {
  try {
    const result = habitLogSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message })
    }

    const habit = await prisma.habit.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    })

    if (!habit) {
      return res.status(404).json({ error: 'Habit not found' })
    }

    const { date, completed, count, note } = result.data

    // Upsert the log
    const log = await prisma.habitLog.upsert({
      where: {
        habitId_date: {
          habitId: habit.id,
          date: new Date(date),
        },
      },
      update: {
        completed: completed ?? true,
        count: count ?? 1,
        note,
      },
      create: {
        userId: req.user!.userId,
        habitId: habit.id,
        date: new Date(date),
        completed: completed ?? true,
        count: count ?? 1,
        note,
      },
    })

    res.json(log)
  } catch (error) {
    console.error('Log habit error:', error)
    res.status(500).json({ error: 'Failed to log habit' })
  }
})

// Delete habit log
router.delete('/:id/log/:date', async (req: Request, res: Response) => {
  try {
    const habit = await prisma.habit.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    })

    if (!habit) {
      return res.status(404).json({ error: 'Habit not found' })
    }

    await prisma.habitLog.delete({
      where: {
        habitId_date: {
          habitId: habit.id,
          date: new Date(req.params.date),
        },
      },
    }).catch(() => {})

    res.json({ success: true })
  } catch (error) {
    console.error('Delete habit log error:', error)
    res.status(500).json({ error: 'Failed to delete habit log' })
  }
})

export default router
