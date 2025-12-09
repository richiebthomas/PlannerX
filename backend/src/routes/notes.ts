// path: backend/src/routes/notes.ts

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

router.use(authenticateToken)

const noteSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1, 'Content is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isJournal: z.boolean().optional(),
  eventId: z.string().optional().nullable(),
  taskId: z.string().optional().nullable(),
  goalId: z.string().optional().nullable(),
})

// Get notes
router.get('/', async (req: Request, res: Response) => {
  try {
    const { date, isJournal, eventId, taskId, goalId, search } = req.query

    const where: any = { userId: req.user!.userId }

    if (date) where.date = new Date(date as string)
    if (isJournal === 'true') where.isJournal = true
    if (isJournal === 'false') where.isJournal = false
    if (eventId) where.eventId = eventId
    if (taskId) where.taskId = taskId
    if (goalId) where.goalId = goalId

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ]
    }

    const notes = await prisma.note.findMany({
      where,
      include: {
        event: { select: { id: true, title: true } },
        task: { select: { id: true, title: true } },
        goal: { select: { id: true, title: true } },
      },
      orderBy: { date: 'desc' },
    })

    res.json(notes)
  } catch (error) {
    console.error('Get notes error:', error)
    res.status(500).json({ error: 'Failed to get notes' })
  }
})

// Get journal entries for date range
router.get('/journal', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query

    const where: any = { 
      userId: req.user!.userId,
      isJournal: true,
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      }
    }

    const notes = await prisma.note.findMany({
      where,
      orderBy: { date: 'desc' },
    })

    res.json(notes)
  } catch (error) {
    console.error('Get journal error:', error)
    res.status(500).json({ error: 'Failed to get journal entries' })
  }
})

// Get single note
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const note = await prisma.note.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
      include: {
        event: { select: { id: true, title: true } },
        task: { select: { id: true, title: true } },
        goal: { select: { id: true, title: true } },
        attachments: true,
      },
    })

    if (!note) {
      return res.status(404).json({ error: 'Note not found' })
    }

    res.json(note)
  } catch (error) {
    console.error('Get note error:', error)
    res.status(500).json({ error: 'Failed to get note' })
  }
})

// Create note
router.post('/', async (req: Request, res: Response) => {
  try {
    const result = noteSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message })
    }

    const data = result.data
    const note = await prisma.note.create({
      data: {
        userId: req.user!.userId,
        title: data.title,
        content: data.content,
        date: new Date(data.date),
        isJournal: data.isJournal ?? false,
        eventId: data.eventId,
        taskId: data.taskId,
        goalId: data.goalId,
      },
    })

    res.status(201).json(note)
  } catch (error) {
    console.error('Create note error:', error)
    res.status(500).json({ error: 'Failed to create note' })
  }
})

// Update note
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const result = noteSchema.partial().safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message })
    }

    const existing = await prisma.note.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Note not found' })
    }

    const data = result.data
    const note = await prisma.note.update({
      where: { id: req.params.id },
      data: {
        title: data.title,
        content: data.content,
        date: data.date ? new Date(data.date) : undefined,
        isJournal: data.isJournal,
        eventId: data.eventId,
        taskId: data.taskId,
        goalId: data.goalId,
      },
    })

    res.json(note)
  } catch (error) {
    console.error('Update note error:', error)
    res.status(500).json({ error: 'Failed to update note' })
  }
})

// Delete note
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await prisma.note.deleteMany({
      where: { id: req.params.id, userId: req.user!.userId },
    })

    if (result.count === 0) {
      return res.status(404).json({ error: 'Note not found' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Delete note error:', error)
    res.status(500).json({ error: 'Failed to delete note' })
  }
})

export default router
