// path: backend/src/routes/notifications.ts

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticateToken } from '../middleware/auth.js'

const router = Router()

router.use(authenticateToken)

// Get notifications
router.get('/', async (req: Request, res: Response) => {
  try {
    const { unreadOnly, limit } = req.query

    const where: any = { userId: req.user!.userId }
    if (unreadOnly === 'true') where.read = false

    // Filter out snoozed notifications
    where.OR = [
      { snoozedUntil: null },
      { snoozedUntil: { lte: new Date() } },
    ]

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit as string) : 50,
    })

    res.json(notifications)
  } catch (error) {
    console.error('Get notifications error:', error)
    res.status(500).json({ error: 'Failed to get notifications' })
  }
})

// Get unread count
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const count = await prisma.notification.count({
      where: {
        userId: req.user!.userId,
        read: false,
        OR: [
          { snoozedUntil: null },
          { snoozedUntil: { lte: new Date() } },
        ],
      },
    })

    res.json({ count })
  } catch (error) {
    console.error('Get unread count error:', error)
    res.status(500).json({ error: 'Failed to get unread count' })
  }
})

// Mark notification as read
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.userId },
      data: { read: true },
    })

    if (result.count === 0) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Mark read error:', error)
    res.status(500).json({ error: 'Failed to mark notification as read' })
  }
})

// Mark all as read
router.post('/mark-all-read', async (req: Request, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, read: false },
      data: { read: true },
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Mark all read error:', error)
    res.status(500).json({ error: 'Failed to mark all as read' })
  }
})

// Snooze notification
router.patch('/:id/snooze', async (req: Request, res: Response) => {
  try {
    const snoozeSchema = z.object({
      minutes: z.number().int().positive(),
    })

    const result = snoozeSchema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid snooze duration' })
    }

    const { minutes } = result.data
    const snoozedUntil = new Date(Date.now() + minutes * 60 * 1000)

    const updateResult = await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.userId },
      data: { snoozedUntil },
    })

    if (updateResult.count === 0) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    res.json({ success: true, snoozedUntil })
  } catch (error) {
    console.error('Snooze error:', error)
    res.status(500).json({ error: 'Failed to snooze notification' })
  }
})

// Delete notification
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await prisma.notification.deleteMany({
      where: { id: req.params.id, userId: req.user!.userId },
    })

    if (result.count === 0) {
      return res.status(404).json({ error: 'Notification not found' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Delete notification error:', error)
    res.status(500).json({ error: 'Failed to delete notification' })
  }
})

// Clear all notifications
router.delete('/', async (req: Request, res: Response) => {
  try {
    await prisma.notification.deleteMany({
      where: { userId: req.user!.userId },
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Clear notifications error:', error)
    res.status(500).json({ error: 'Failed to clear notifications' })
  }
})

export default router
