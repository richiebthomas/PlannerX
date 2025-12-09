// path: backend/src/routes/events.ts

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

router.use(authenticateToken)

const eventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  location: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  allDay: z.boolean().optional(),
  isFocusBlock: z.boolean().optional(),
  categoryId: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.string().optional().nullable(),
  recurrenceEnd: z.string().datetime().optional().nullable(),
})

const eventQuerySchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  categoryId: z.string().optional(),
  search: z.string().optional(),
})

// Get events
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = eventQuerySchema.parse(req.query)

    const where: any = { userId: req.user!.userId }

    if (query.start && query.end) {
      where.OR = [
        {
          startTime: { gte: new Date(query.start), lte: new Date(query.end) },
        },
        {
          endTime: { gte: new Date(query.start), lte: new Date(query.end) },
        },
        {
          AND: [
            { startTime: { lte: new Date(query.start) } },
            { endTime: { gte: new Date(query.end) } },
          ],
        },
      ]
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        category: true,
        reminders: true,
      },
      orderBy: { startTime: 'asc' },
    })

    res.json(events)
  } catch (error) {
    console.error('Get events error:', error)
    res.status(500).json({ error: 'Failed to get events' })
  }
})

// Get single event
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const event = await prisma.event.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
      include: {
        category: true,
        reminders: true,
        notes: true,
        attachments: true,
      },
    })

    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }

    res.json(event)
  } catch (error) {
    console.error('Get event error:', error)
    res.status(500).json({ error: 'Failed to get event' })
  }
})

// Create event
router.post('/', async (req: Request, res: Response) => {
  try {
    const result = eventSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message })
    }

    const data = result.data

    const event = await prisma.event.create({
      data: {
        userId: req.user!.userId,
        title: data.title,
        description: data.description,
        location: data.location,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        allDay: data.allDay ?? false,
        isFocusBlock: data.isFocusBlock ?? false,
        categoryId: data.categoryId,
        color: data.color,
        isRecurring: data.isRecurring ?? false,
        recurrenceRule: data.recurrenceRule,
        recurrenceEnd: data.recurrenceEnd ? new Date(data.recurrenceEnd) : null,
      },
      include: {
        category: true,
        reminders: true,
      },
    })

    res.status(201).json(event)
  } catch (error) {
    console.error('Create event error:', error)
    res.status(500).json({ error: 'Failed to create event' })
  }
})

// Update event
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const result = eventSchema.partial().safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message })
    }

    const existing = await prisma.event.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Event not found' })
    }

    const data = result.data
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        title: data.title,
        description: data.description,
        location: data.location,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        allDay: data.allDay,
        isFocusBlock: data.isFocusBlock,
        categoryId: data.categoryId,
        color: data.color,
        isRecurring: data.isRecurring,
        recurrenceRule: data.recurrenceRule,
        recurrenceEnd: data.recurrenceEnd ? new Date(data.recurrenceEnd) : undefined,
      },
      include: {
        category: true,
        reminders: true,
      },
    })

    res.json(event)
  } catch (error) {
    console.error('Update event error:', error)
    res.status(500).json({ error: 'Failed to update event' })
  }
})

// Delete event
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await prisma.event.deleteMany({
      where: { id: req.params.id, userId: req.user!.userId },
    })

    if (result.count === 0) {
      return res.status(404).json({ error: 'Event not found' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Delete event error:', error)
    res.status(500).json({ error: 'Failed to delete event' })
  }
})

// Add reminder to event
router.post('/:id/reminders', async (req: Request, res: Response) => {
  try {
    const { offset } = req.body

    const event = await prisma.event.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    })

    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }

    const reminder = await prisma.reminder.create({
      data: {
        eventId: event.id,
        offset: offset ?? 10, // Default 10 minutes
      },
    })

    res.status(201).json(reminder)
  } catch (error) {
    console.error('Add reminder error:', error)
    res.status(500).json({ error: 'Failed to add reminder' })
  }
})

export default router
