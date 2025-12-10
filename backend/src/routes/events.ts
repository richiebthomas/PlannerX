// path: backend/src/routes/events.ts

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getOAuthClient } from '../lib/google.js'
import { google } from 'googleapis'
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

    const allDay = data.allDay ?? false
    const startTime = allDay ? normalizeAllDayDate(data.startTime) : new Date(data.startTime)
    const endTime = allDay ? normalizeAllDayDate(data.endTime) : new Date(data.endTime)

    const event = await prisma.event.create({
      data: {
        userId: req.user!.userId,
        title: data.title,
        description: data.description,
        location: data.location,
        startTime,
        endTime,
        allDay,
        isFocusBlock: data.isFocusBlock ?? false,
        categoryId: normalizeNullableId(data.categoryId),
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

    await syncToGoogle(req.user!.userId, event)

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
    const allDay = data.allDay ?? existing.allDay ?? false
    const startTime =
      data.startTime !== undefined
        ? allDay
          ? normalizeAllDayDate(data.startTime)
          : new Date(data.startTime)
        : undefined
    const endTime =
      data.endTime !== undefined
        ? allDay
          ? normalizeAllDayDate(data.endTime)
          : new Date(data.endTime)
        : undefined

    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        title: data.title,
        description: data.description,
        location: data.location,
        startTime,
        endTime,
        allDay: data.allDay,
        isFocusBlock: data.isFocusBlock,
        categoryId: data.categoryId !== undefined ? normalizeNullableId(data.categoryId) : undefined,
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

    await syncToGoogle(req.user!.userId, event)

    res.json(event)
  } catch (error) {
    console.error('Update event error:', error)
    res.status(500).json({ error: 'Failed to update event' })
  }
})

// Delete event
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.event.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    })

    const result = await prisma.event.deleteMany({
      where: { id: req.params.id, userId: req.user!.userId },
    })

    if (existing) {
      await deleteFromGoogle(req.user!.userId, existing)
    }

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

async function getCalendarClientForUser(userId: string) {
  const account = await prisma.googleAccount.findUnique({
    where: { userId },
  })
  if (!account || !account.selectedCalendarId) return null

  const auth = getOAuthClient()
  auth.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
  })

  const calendar = google.calendar({ version: 'v3', auth })
  return { calendar, account }
}

function mapEventToGoogle(event: any) {
  const isAllDay = event.allDay
  const startDateOnly = isAllDay ? toLocalDateOnly(event.startTime) : null
  const endDateOnly = isAllDay ? toLocalDateOnly(event.endTime) : null

  const start = isAllDay
    ? { date: startDateOnly }
    : { dateTime: event.startTime.toISOString() }

  // Google expects all-day end as exclusive; bump by 1 day
  const end = isAllDay
    ? { date: addDaysDateOnly(endDateOnly || startDateOnly, 1) }
    : { dateTime: event.endTime.toISOString() }

  return {
    summary: event.title,
    description: event.description || undefined,
    location: event.location || undefined,
    start,
    end,
  }
}

async function syncToGoogle(userId: string, event: any) {
  const client = await getCalendarClientForUser(userId)
  if (!client) return
  const { calendar, account } = client
  const calendarId = account.selectedCalendarId!

  const body = mapEventToGoogle(event)

  let googleEventId = event.googleEventId
  let googleEtag = event.googleEtag

  try {
    if (googleEventId) {
      const res = await calendar.events.patch({
        calendarId,
        eventId: googleEventId,
        requestBody: body,
      })
      googleEtag = res.data.etag || googleEtag
    } else {
      const res = await calendar.events.insert({
        calendarId,
        requestBody: body,
      })
      googleEventId = res.data.id || undefined
      googleEtag = res.data.etag || googleEtag
    }

    if (googleEventId) {
      await prisma.event.update({
        where: { id: event.id },
        data: {
          googleEventId,
          googleCalendarId: calendarId,
          googleEtag,
        },
      })
    }
  } catch (err) {
    console.warn('syncToGoogle failed', err)
  }
}

async function deleteFromGoogle(userId: string, event: any) {
  const client = await getCalendarClientForUser(userId)
  if (!client) return
  const { calendar, account } = client
  const calendarId = account.selectedCalendarId!

  if (!event.googleEventId) return
  try {
    await calendar.events.delete({
      calendarId,
      eventId: event.googleEventId,
    })
  } catch (err) {
    console.warn('deleteFromGoogle failed', err)
  }
}

function normalizeAllDayDate(dateStr: string) {
  const d = new Date(dateStr)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0, 0))
}

function toLocalDateOnly(date: Date) {
  const d = new Date(date)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().split('T')[0]
}

function addDaysDateOnly(dateOnly: string | null, days: number) {
  if (!dateOnly) return undefined
  const d = new Date(`${dateOnly}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

function normalizeNullableId(value: string | null | undefined) {
  if (!value || value === 'none') return null
  return value
}

export default router
