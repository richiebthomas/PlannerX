// path: backend/src/routes/goals.ts

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

router.use(authenticateToken)

const goalSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  type: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
  color: z.string().optional(),
  isRecurring: z.boolean().optional(),
})

// Helper function to calculate next period dates based on goal type
function getNextPeriodDates(type: string, currentEndDate: Date): { startDate: Date; endDate: Date } {
  const start = new Date(currentEndDate)
  start.setDate(start.getDate() + 1) // Start the day after current period ends

  const end = new Date(start)
  
  switch (type) {
    case 'DAILY':
      // Next day
      end.setDate(end.getDate())
      break
    case 'WEEKLY':
      // Next 7 days
      end.setDate(end.getDate() + 6)
      break
    case 'MONTHLY':
      // Next month
      end.setMonth(end.getMonth() + 1)
      end.setDate(end.getDate() - 1)
      break
    case 'YEARLY':
      // Next year
      end.setFullYear(end.getFullYear() + 1)
      end.setDate(end.getDate() - 1)
      break
    default:
      end.setDate(end.getDate() + 6)
  }
  
  return { startDate: start, endDate: end }
}

// Get all goals
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type, status } = req.query

    const where: any = { userId: req.user!.userId }
    if (type) where.type = type
    if (status) where.status = status

    // Only show goals that have started (startDate <= now)
    // This prevents future recurring goals from appearing prematurely
    where.startDate = { lte: new Date() }

    const goals = await prisma.goal.findMany({
      where,
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { startDate: 'desc' },
    })

    // Add progress calculation
    const goalsWithProgress = goals.map((goal) => {
      const totalTasks = goal.tasks.length
      const completedTasks = goal.tasks.filter((t) => t.status === 'DONE').length
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

      return {
        ...goal,
        progress,
        completedTasks,
        totalTasks,
      }
    })

    res.json(goalsWithProgress)
  } catch (error) {
    console.error('Get goals error:', error)
    res.status(500).json({ error: 'Failed to get goals' })
  }
})

// Get single goal
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const goal = await prisma.goal.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
      include: {
        tasks: {
          orderBy: { createdAt: 'desc' },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' })
    }

    const totalTasks = goal.tasks.length
    const completedTasks = goal.tasks.filter((t) => t.status === 'DONE').length
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    res.json({
      ...goal,
      progress,
      completedTasks,
      totalTasks,
    })
  } catch (error) {
    console.error('Get goal error:', error)
    res.status(500).json({ error: 'Failed to get goal' })
  }
})

// Create goal
router.post('/', async (req: Request, res: Response) => {
  try {
    const result = goalSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message })
    }

    const data = result.data
    const goal = await prisma.goal.create({
      data: {
        userId: req.user!.userId,
        title: data.title,
        description: data.description,
        type: data.type ?? 'WEEKLY',
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: data.status ?? 'ACTIVE',
        color: data.color,
        isRecurring: data.isRecurring ?? false,
      },
    })

    res.status(201).json(goal)
  } catch (error) {
    console.error('Create goal error:', error)
    res.status(500).json({ error: 'Failed to create goal' })
  }
})

// Update goal
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const result = goalSchema.partial().safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message })
    }

    const existing = await prisma.goal.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
      include: {
        tasks: true
      }
    })

    if (!existing) {
      return res.status(404).json({ error: 'Goal not found' })
    }

    const data = result.data
    
    // Check if we're completing a recurring goal
    const isCompletingRecurringGoal = 
      data.status === 'COMPLETED' && 
      existing.status !== 'COMPLETED' && 
      existing.isRecurring

    const goal = await prisma.goal.update({
      where: { id: req.params.id },
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        status: data.status,
        color: data.color,
        isRecurring: data.isRecurring,
      },
    })

    // If completing a recurring goal, create the next period goal
    if (isCompletingRecurringGoal) {
      const nextDates = getNextPeriodDates(existing.type, existing.endDate)
      
      const nextGoal = await prisma.goal.create({
        data: {
          userId: existing.userId,
          title: existing.title,
          description: existing.description,
          type: existing.type,
          startDate: nextDates.startDate,
          endDate: nextDates.endDate,
          status: 'ACTIVE',
          color: existing.color,
          isRecurring: true,
        },
      })

      // Copy ALL tasks to the new goal (both completed and incomplete)
      // This allows the same tasks to be completed again in the next period
      if (existing.tasks.length > 0) {
        const taskCopies = existing.tasks.map(task => ({
          userId: existing.userId,
          title: task.title,
          description: task.description,
          dueDate: task.dueDate,
          estimatedTime: task.estimatedTime,
          priority: task.priority,
          status: 'TODO' as const, // Reset to TODO for new period
          categoryId: task.categoryId,
          goalId: nextGoal.id,
          parentTaskId: task.parentTaskId,
          position: task.position,
          isRecurring: true, // Mark as recurring task
          // Note: completedAt is not copied - it will be null for the new tasks
        }))

        await prisma.task.createMany({
          data: taskCopies
        })
      }

      // Return both the completed goal and info about the new goal
      return res.json({ 
        ...goal, 
        nextGoal: {
          id: nextGoal.id,
          title: nextGoal.title,
          startDate: nextGoal.startDate,
          endDate: nextGoal.endDate,
        }
      })
    }

    res.json(goal)
  } catch (error) {
    console.error('Update goal error:', error)
    res.status(500).json({ error: 'Failed to update goal' })
  }
})

// Delete goal
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await prisma.goal.deleteMany({
      where: { id: req.params.id, userId: req.user!.userId },
    })

    if (result.count === 0) {
      return res.status(404).json({ error: 'Goal not found' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Delete goal error:', error)
    res.status(500).json({ error: 'Failed to delete goal' })
  }
})

export default router
