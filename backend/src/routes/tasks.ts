// path: backend/src/routes/tasks.ts

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

router.use(authenticateToken)

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional().nullable(),
  estimatedTime: z.number().int().positive().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  categoryId: z.string().optional().nullable(),
  goalId: z.string().optional().nullable(),
  parentTaskId: z.string().optional().nullable(),
  position: z.number().int().optional(),
})

const taskQuerySchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  categoryId: z.string().optional(),
  goalId: z.string().optional(),
  dueStart: z.string().datetime().optional(),
  dueEnd: z.string().datetime().optional(),
  search: z.string().optional(),
  parentTaskId: z.string().optional(),
})

// Get tasks
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = taskQuerySchema.parse(req.query)

    const where: any = { 
      userId: req.user!.userId,
      parentTaskId: query.parentTaskId ?? null, // Get top-level tasks by default
    }

    if (query.status) where.status = query.status
    if (query.priority) where.priority = query.priority
    if (query.categoryId) where.categoryId = query.categoryId
    if (query.goalId) where.goalId = query.goalId

    if (query.dueStart || query.dueEnd) {
      where.dueDate = {}
      if (query.dueStart) where.dueDate.gte = new Date(query.dueStart)
      if (query.dueEnd) where.dueDate.lte = new Date(query.dueEnd)
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        category: true,
        goal: true,
        subtasks: {
          orderBy: { position: 'asc' },
        },
        _count: {
          select: { subtasks: true },
        },
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { position: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    res.json(tasks)
  } catch (error) {
    console.error('Get tasks error:', error)
    res.status(500).json({ error: 'Failed to get tasks' })
  }
})

// Get single task
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
      include: {
        category: true,
        goal: true,
        subtasks: {
          orderBy: { position: 'asc' },
        },
        reminders: true,
        notes: true,
        attachments: true,
      },
    })

    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    res.json(task)
  } catch (error) {
    console.error('Get task error:', error)
    res.status(500).json({ error: 'Failed to get task' })
  }
})

// Create task
router.post('/', async (req: Request, res: Response) => {
  try {
    const result = taskSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message })
    }

    const data = result.data

    // Verify parent task belongs to user if provided
    if (data.parentTaskId) {
      const parentTask = await prisma.task.findFirst({
        where: { id: data.parentTaskId, userId: req.user!.userId },
      })
      if (!parentTask) {
        return res.status(400).json({ error: 'Parent task not found' })
      }
    }

    const task = await prisma.task.create({
      data: {
        userId: req.user!.userId,
        title: data.title,
        description: data.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        estimatedTime: data.estimatedTime,
        priority: data.priority ?? 'MEDIUM',
        status: data.status ?? 'TODO',
        categoryId: data.categoryId,
        goalId: data.goalId,
        parentTaskId: data.parentTaskId,
        position: data.position ?? 0,
      },
      include: {
        category: true,
        goal: true,
        subtasks: true,
      },
    })

    res.status(201).json(task)
  } catch (error) {
    console.error('Create task error:', error)
    res.status(500).json({ error: 'Failed to create task' })
  }
})

// Update task
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const result = taskSchema.partial().safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message })
    }

    const existing = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Task not found' })
    }

    const data = result.data
    const updateData: any = {
      title: data.title,
      description: data.description,
      estimatedTime: data.estimatedTime,
      priority: data.priority,
      status: data.status,
      categoryId: data.categoryId,
      goalId: data.goalId,
      position: data.position,
    }

    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null
    }

    // Set completedAt when status changes to DONE
    if (data.status === 'DONE' && existing.status !== 'DONE') {
      updateData.completedAt = new Date()
    } else if (data.status && data.status !== 'DONE') {
      updateData.completedAt = null
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        category: true,
        goal: true,
        subtasks: true,
      },
    })

    res.json(task)
  } catch (error) {
    console.error('Update task error:', error)
    res.status(500).json({ error: 'Failed to update task' })
  }
})

// Delete task
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await prisma.task.deleteMany({
      where: { id: req.params.id, userId: req.user!.userId },
    })

    if (result.count === 0) {
      return res.status(404).json({ error: 'Task not found' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Delete task error:', error)
    res.status(500).json({ error: 'Failed to delete task' })
  }
})

// Reorder tasks
router.post('/reorder', async (req: Request, res: Response) => {
  try {
    const { taskIds } = req.body

    if (!Array.isArray(taskIds)) {
      return res.status(400).json({ error: 'taskIds must be an array' })
    }

    await prisma.$transaction(
      taskIds.map((id: string, index: number) =>
        prisma.task.updateMany({
          where: { id, userId: req.user!.userId },
          data: { position: index },
        })
      )
    )

    res.json({ success: true })
  } catch (error) {
    console.error('Reorder tasks error:', error)
    res.status(500).json({ error: 'Failed to reorder tasks' })
  }
})

export default router
