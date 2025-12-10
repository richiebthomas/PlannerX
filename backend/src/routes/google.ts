// path: backend/src/routes/google.ts
import { Router, Request, Response } from 'express'
import { google } from 'googleapis'
import crypto from 'crypto'
import { z } from 'zod'
import { addDays } from 'date-fns'
import { authenticateToken } from '../middleware/auth.js'
import { getOAuthClient } from '../lib/google.js'
import { prisma } from '../lib/prisma.js'
import { env } from '../env.js'

const router = Router()

const calendarScopes = [
  'https://www.googleapis.com/auth/calendar', // full calendar scope (includes list)
  'https://www.googleapis.com/auth/calendar.events',
  'openid',
  'email',
  'profile',
]

// Webhook endpoint (Google push notifications) - must NOT require auth
router.post('/webhook', async (req: Request, res: Response) => {
  // Google expects quick 200
  res.status(200).end()

  const channelId = req.header('X-Goog-Channel-ID')
  const resourceId = req.header('X-Goog-Resource-ID')

  if (!channelId || !resourceId) {
    return
  }

  try {
    const channel = await (prisma as any).googleChannel.findUnique({
      where: { channelId },
    })
    if (!channel) return

    await syncFromGoogle({
      userId: channel.userId,
      calendarId: channel.calendarId,
      syncToken: channel.syncToken,
      channelId: channel.channelId,
      forceFull: false,
    })
  } catch (error) {
    console.error('Webhook handling error', error)
  }
})

// Protected routes require auth
router.use(authenticateToken)

// Start OAuth
router.get('/auth', async (req: Request, res: Response) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
    return res.status(500).json({ error: 'Google OAuth env vars not configured' })
  }

  const oauth2Client = getOAuthClient()
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: calendarScopes,
  })
  return res.json({ url })
})

// OAuth callback exchange
router.get('/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string | undefined
  if (!code) return res.status(400).json({ error: 'Missing code' })

  if (!req.user) {
    return res.status(401).json({ error: 'User not authenticated. Please sign in first, then connect Google.' })
  }

  try {
    const oauth2Client = getOAuthClient()
    const { tokens } = await oauth2Client.getToken(code)

    // Apply credentials immediately so downstream calls carry the access token
    oauth2Client.setCredentials(tokens)

    if (!tokens.access_token) {
      return res.status(400).json({ error: 'Failed to obtain access token' })
    }

    const oauthUser = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data: userinfo } = await oauthUser.userinfo.get()
    const googleUserId = userinfo.id || ''
    const googleEmail = userinfo.email || ''

    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 55 * 60 * 1000)

    await (prisma as any).googleAccount.upsert({
      where: { userId: req.user!.userId },
      create: {
        userId: req.user!.userId,
        googleUserId,
        googleEmail,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        scope: tokens.scope,
        expiresAt,
      },
      update: {
        googleUserId,
        googleEmail,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        scope: tokens.scope || undefined,
        expiresAt,
      },
    })

    // Redirect back to frontend with a flag
    if (env.FRONTEND_URL) {
      return res.redirect(`${env.FRONTEND_URL.replace(/\/$/, '')}/settings?google=connected`)
    }

    return res.json({ connected: true, googleEmail })
  } catch (error) {
    console.error('Google OAuth callback error', error)
    return res.status(500).json({ error: 'OAuth failed' })
  }
})

// List calendars for the connected user
router.get('/calendars', async (req: Request, res: Response) => {
  try {
    const account = await (prisma as any).googleAccount.findUnique({
      where: { userId: req.user!.userId },
    })
    if (!account) return res.status(400).json({ error: 'Not connected to Google' })

    const auth = getOAuthClient()
    auth.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
    })
    const calendar = google.calendar({ version: 'v3', auth })
    const { data } = await calendar.calendarList.list()
    return res.json({ items: data.items || [] })
  } catch (error) {
    console.error('List calendars error', error)
    return res.status(500).json({ error: 'Failed to list calendars' })
  }
})

// Start a push watch channel for a calendar
router.post('/watch', async (req: Request, res: Response) => {
  const bodySchema = z.object({
    calendarId: z.string(),
  })
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message })

  try {
    const account = await (prisma as any).googleAccount.findUnique({
      where: { userId: req.user!.userId },
    })
    if (!account) return res.status(400).json({ error: 'Not connected to Google' })

    const auth = getOAuthClient()
    auth.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
    })
    const calendar = google.calendar({ version: 'v3', auth })

    const channelId = crypto.randomUUID()
    const watchRes = await calendar.events.watch({
      calendarId: parsed.data.calendarId,
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: env.GOOGLE_WEBHOOK_URL,
      },
    })

    const resourceId = watchRes.data.resourceId
    const expiration = watchRes.data.expiration

    if (!resourceId || !expiration) {
      return res.status(500).json({ error: 'Failed to start watch channel' })
    }

    // Optional: prime syncToken by performing an initial list (lightweight)
    let syncToken: string | null = null
    try {
      const listRes = await calendar.events.list({
        calendarId: parsed.data.calendarId,
        maxResults: 10,
        singleEvents: true,
        orderBy: 'updated',
      })
      if (listRes.data.nextSyncToken) {
        syncToken = listRes.data.nextSyncToken
      }
    } catch (err) {
      console.warn('Initial sync token fetch failed; will sync on webhook', err)
    }

    try {
      await (prisma as any).googleChannel.upsert({
        where: { channelId },
        create: {
          userId: req.user!.userId,
          calendarId: parsed.data.calendarId,
          channelId,
          resourceId,
          expiration: new Date(Number(expiration)),
          syncToken: syncToken || undefined,
        },
        update: {
          calendarId: parsed.data.calendarId,
          resourceId,
          expiration: new Date(Number(expiration)),
          syncToken: syncToken || undefined,
        },
      })
    } catch (err: any) {
      // Handle unique constraint on resourceId by updating the existing channel for this resourceId
      if (err?.code === 'P2002' && err?.meta?.target?.includes('resourceId')) {
        await (prisma as any).googleChannel.update({
          where: { resourceId },
          data: {
            userId: req.user!.userId,
            calendarId: parsed.data.calendarId,
            channelId,
            expiration: new Date(Number(expiration)),
            syncToken: syncToken || undefined,
          },
        })
      } else {
        throw err
      }
    }

    // Store selected calendar on account
    await (prisma as any).googleAccount.update({
      where: { userId: req.user!.userId },
      data: { selectedCalendarId: parsed.data.calendarId },
    })

    return res.json({ channelId, resourceId, expiration })
  } catch (error) {
    console.error('Start watch error', error)
    return res.status(500).json({ error: 'Failed to start watch' })
  }
})

// Manual sync (on-demand pull) for current user's selected calendar
router.post('/sync-now', async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const account = await (prisma as any).googleAccount.findUnique({
      where: { userId: req.user.userId },
    })
    if (!account || !account.selectedCalendarId) {
      return res.status(400).json({ error: 'No connected Google calendar' })
    }

    // Try to find an existing channel to reuse syncToken
    const channel = await (prisma as any).googleChannel.findFirst({
      where: {
        userId: req.user.userId,
        calendarId: account.selectedCalendarId,
      },
    })

    await syncFromGoogle({
      userId: req.user.userId,
      calendarId: account.selectedCalendarId,
      channelId: channel?.channelId ?? null,
      syncToken: channel?.syncToken ?? null,
      forceFull: !channel?.syncToken, // if no token, do a broader pull
    })

    return res.json({ synced: true })
  } catch (error) {
    console.error('Manual sync error', error)
    return res.status(500).json({ error: 'Failed to sync now' })
  }
})

// Webhook endpoint (Google push notifications)
router.post('/webhook', async (req: Request, res: Response) => {
  // Google expects quick 200
  res.status(200).end()

  const channelId = req.header('X-Goog-Channel-ID')
  const resourceId = req.header('X-Goog-Resource-ID')
  const resourceState = req.header('X-Goog-Resource-State') // e.g., exists, sync, not_exists

  if (!channelId || !resourceId) {
    return
  }

  try {
    const channel = await (prisma as any).googleChannel.findUnique({
      where: { channelId },
    })
    if (!channel) return

    await syncFromGoogle(channel)
  } catch (error) {
    console.error('Webhook handling error', error)
  }
})

async function syncFromGoogle(args: { userId: string; calendarId: string; channelId?: string | null; syncToken: string | null; forceFull: boolean }) {
  const { userId, calendarId, channelId, syncToken, forceFull } = args
  const account = await (prisma as any).googleAccount.findUnique({
    where: { userId },
  })
  if (!account) return

  const auth = getOAuthClient()
  auth.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
  })
  const calendar = google.calendar({ version: 'v3', auth })

  let pageToken: string | undefined = undefined
  let nextSyncToken: string | null = null
  let total = 0

  do {
    const listParams: any = {
      calendarId,
      singleEvents: true,
      showDeleted: true,
      maxResults: 2500,
      pageToken,
    }

    if (!forceFull && syncToken) {
      listParams.syncToken = syncToken
    } else {
      listParams.timeMin = addDays(new Date(), -90).toISOString()
      listParams.orderBy = 'updated'
    }

    const res = await calendar.events.list(listParams)
    const items = res.data.items || []
    total += items.length
    pageToken = res.data.nextPageToken || undefined
    if (res.data.nextSyncToken) {
      nextSyncToken = res.data.nextSyncToken
    }

    for (const item of items) {
      if (!item.id) continue

      if (item.status === 'cancelled') {
        await prisma.event.deleteMany({
          where: { userId, googleEventId: item.id } as any,
        })
        continue
      }

      const start = item.start?.dateTime || item.start?.date
      const end = item.end?.dateTime || item.end?.date
      if (!start || !end) continue

      const allDay = !!item.start?.date
      const startDate = allDay ? normalizeAllDayDate(start) : new Date(start)
      const endDate = allDay ? normalizeAllDayDate(end) : new Date(end)

      const existing = await prisma.event.findFirst({
        where: { userId, googleEventId: item.id } as any,
      })

      if (existing) {
        await prisma.event.update({
          where: { id: existing.id },
          data: {
            title: item.summary || 'Untitled event',
            description: item.description || null,
            location: item.location || null,
            startTime: startDate,
            endTime: endDate,
            allDay,
            isRecurring: !!item.recurringEventId,
            googleCalendarId: calendarId,
            googleEtag: item.etag || null,
          } as any,
        })
      } else {
        await prisma.event.create({
          data: {
            userId,
            title: item.summary || 'Untitled event',
            description: item.description || null,
            location: item.location || null,
            startTime: startDate,
            endTime: endDate,
            allDay,
            isFocusBlock: false,
            isRecurring: !!item.recurringEventId,
            googleEventId: item.id,
            googleCalendarId: calendarId,
            googleEtag: item.etag || null,
          } as any,
        })
      }
    }
  } while (pageToken)

  console.log('Google sync complete', {
    calendarId,
    total,
    usedSyncToken: !!syncToken && !forceFull,
    forceFull,
    channelId: channelId || null,
    nextSyncTokenSet: !!nextSyncToken,
  })

  if (nextSyncToken && channelId) {
    await (prisma as any).googleChannel.update({
      where: { channelId },
      data: { syncToken: nextSyncToken } as any,
    })
  }
}

// Disconnect: delete tokens and channels
router.delete('/disconnect', async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
  try {
    await (prisma as any).googleChannel.deleteMany({
      where: { userId: req.user.userId },
    })
    await (prisma as any).googleAccount.deleteMany({
      where: { userId: req.user.userId },
    })
    return res.json({ disconnected: true })
  } catch (error) {
    console.error('Disconnect Google error', error)
    return res.status(500).json({ error: 'Failed to disconnect Google' })
  }
})

function normalizeAllDayDate(dateStr: string) {
  const d = new Date(dateStr)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0, 0))
}

export default router

