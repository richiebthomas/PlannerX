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
  const resourceState = req.header('X-Goog-Resource-State')
  const messageNumber = req.header('X-Goog-Message-Number')

  console.log('[Webhook] Received webhook notification', {
    channelId,
    resourceId,
    resourceState,
    messageNumber,
    timestamp: new Date().toISOString(),
  })

  if (!channelId || !resourceId) {
    console.warn('[Webhook] Missing required headers, ignoring webhook')
    return
  }

  try {
    const channel = await (prisma as any).googleChannel.findUnique({
      where: { channelId },
    })
    
    if (!channel) {
      console.warn('[Webhook] Channel not found in DB', { channelId, resourceId })
      return
    }

    console.log('[Webhook] Found channel, starting sync', {
      userId: channel.userId,
      calendarId: channel.calendarId,
      hasSyncToken: !!channel.syncToken,
      syncToken: channel.syncToken?.substring(0, 20) + '...',
    })

    await syncFromGoogle({
      userId: channel.userId,
      calendarId: channel.calendarId,
      syncToken: channel.syncToken,
      channelId: channel.channelId,
      forceFull: false,
    })

    console.log('[Webhook] Sync completed successfully')
  } catch (error) {
    console.error('[Webhook] Handling error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      channelId,
      resourceId,
    })
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

  console.log('[Watch] Starting watch channel', {
    userId: req.user!.userId,
    calendarId: parsed.data.calendarId,
    webhookUrl: env.GOOGLE_WEBHOOK_URL,
  })

  try {
    const account = await (prisma as any).googleAccount.findUnique({
      where: { userId: req.user!.userId },
    })
    if (!account) {
      console.warn('[Watch] No Google account found', { userId: req.user!.userId })
      return res.status(400).json({ error: 'Not connected to Google' })
    }

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
      console.error('[Watch] Missing resourceId or expiration from Google', { watchRes: watchRes.data })
      return res.status(500).json({ error: 'Failed to start watch channel' })
    }

    console.log('[Watch] Watch channel created successfully', {
      channelId,
      resourceId,
      expiration: new Date(Number(expiration)).toISOString(),
    })

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
        console.log('[Watch] Initial syncToken obtained', { syncToken: syncToken.substring(0, 20) + '...' })
      }
    } catch (err) {
      console.warn('[Watch] Initial sync token fetch failed; will sync on webhook', {
        error: err instanceof Error ? err.message : String(err),
      })
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
      console.log('[Watch] Channel saved to database', { channelId })
    } catch (err: any) {
      // Handle unique constraint on resourceId by updating the existing channel for this resourceId
      if (err?.code === 'P2002' && err?.meta?.target?.includes('resourceId')) {
        console.log('[Watch] Updating existing channel with same resourceId', { resourceId })
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

    console.log('[Watch] Watch channel setup complete', {
      userId: req.user!.userId,
      calendarId: parsed.data.calendarId,
      channelId,
      resourceId,
    })

    return res.json({ channelId, resourceId, expiration })
  } catch (error) {
    console.error('[Watch] Start watch error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.user!.userId,
      calendarId: parsed.data.calendarId,
    })
    return res.status(500).json({ error: 'Failed to start watch' })
  }
})

// Manual sync (on-demand pull) for current user's selected calendar
router.post('/sync-now', async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
  
  console.log('[Sync-Now] Manual sync requested', { userId: req.user.userId })
  
  try {
    const account = await (prisma as any).googleAccount.findUnique({
      where: { userId: req.user.userId },
    })
    if (!account || !account.selectedCalendarId) {
      console.warn('[Sync-Now] No connected Google calendar', { userId: req.user.userId })
      return res.status(400).json({ error: 'No connected Google calendar' })
    }

    // Try to find an existing channel to reuse syncToken
    const channel = await (prisma as any).googleChannel.findFirst({
      where: {
        userId: req.user.userId,
        calendarId: account.selectedCalendarId,
      },
    })

    console.log('[Sync-Now] Starting sync', {
      userId: req.user.userId,
      calendarId: account.selectedCalendarId,
      hasChannel: !!channel,
      hasSyncToken: !!channel?.syncToken,
    })

    await syncFromGoogle({
      userId: req.user.userId,
      calendarId: account.selectedCalendarId,
      channelId: channel?.channelId ?? null,
      syncToken: channel?.syncToken ?? null,
      forceFull: !channel?.syncToken, // if no token, do a broader pull
      daysWindow: channel?.syncToken ? undefined : 30, // Smaller window if no syncToken to avoid timeout
    })

    console.log('[Sync-Now] Manual sync completed successfully')
    return res.json({ synced: true })
  } catch (error) {
    console.error('[Sync-Now] Manual sync error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.user.userId,
    })
    return res.status(500).json({ error: 'Failed to sync now' })
  }
})

// One-time backfill (larger window) for current user's selected calendar
router.post('/backfill', async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
  
  console.log('[Backfill] Backfill requested', { userId: req.user.userId })
  
  try {
    const account = await (prisma as any).googleAccount.findUnique({
      where: { userId: req.user.userId },
    })
    if (!account || !account.selectedCalendarId) {
      console.warn('[Backfill] No connected Google calendar', { userId: req.user.userId })
      return res.status(400).json({ error: 'No connected Google calendar' })
    }

    console.log('[Backfill] Starting backfill (1 year window)', {
      userId: req.user.userId,
      calendarId: account.selectedCalendarId,
    })

    // Ignore syncToken and pull a larger window (1 year)
    await syncFromGoogle({
      userId: req.user.userId,
      calendarId: account.selectedCalendarId,
      channelId: null,
      syncToken: null,
      forceFull: true,
      daysWindow: 365,
    })

    console.log('[Backfill] Backfill completed successfully')
    return res.json({ backfilled: true })
  } catch (error) {
    console.error('[Backfill] Backfill sync error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.user.userId,
    })
    return res.status(500).json({ error: 'Failed to backfill' })
  }
})

async function syncFromGoogle(args: {
  userId: string
  calendarId: string
  channelId?: string | null
  syncToken: string | null
  forceFull: boolean
  daysWindow?: number
}) {
  const startTime = Date.now()
  const { userId, calendarId, channelId, syncToken, forceFull, daysWindow } = args
  
  console.log('[Sync] Starting syncFromGoogle', {
    userId,
    calendarId,
    channelId: channelId || null,
    hasSyncToken: !!syncToken,
    syncToken: syncToken?.substring(0, 20) + '...' || null,
    forceFull,
    daysWindow: daysWindow ?? 90,
  })

  const account = await (prisma as any).googleAccount.findUnique({
    where: { userId },
  })
  if (!account) {
    console.error('[Sync] Google account not found', { userId })
    return
  }

  const auth = getOAuthClient()
  auth.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
  })
  const calendar = google.calendar({ version: 'v3', auth })

  let pageToken: string | undefined = undefined
  let nextSyncToken: string | null = null
  let total = 0
  let pageCount = 0
  let created = 0
  let updated = 0
  let deleted = 0

  do {
    pageCount++
    const listParams: any = {
      calendarId,
      singleEvents: true,
      showDeleted: true,
      maxResults: 2500,
      pageToken,
    }

    if (!forceFull && syncToken) {
      listParams.syncToken = syncToken
      console.log(`[Sync] Page ${pageCount}: Using syncToken for incremental sync`)
    } else {
      const windowDays = daysWindow ?? 90
      listParams.timeMin = addDays(new Date(), -windowDays).toISOString()
      listParams.orderBy = 'updated'
      console.log(`[Sync] Page ${pageCount}: Using time window (${windowDays} days)`, {
        timeMin: listParams.timeMin,
      })
    }

    const res = await calendar.events.list(listParams)
    const items = res.data.items || []
    const pageItemCount = items.length
    total += pageItemCount
    
    console.log(`[Sync] Page ${pageCount}: Fetched ${pageItemCount} events from Google`, {
      hasNextPage: !!res.data.nextPageToken,
      hasNextSyncToken: !!res.data.nextSyncToken,
    })

    pageToken = res.data.nextPageToken || undefined
    if (res.data.nextSyncToken) {
      nextSyncToken = res.data.nextSyncToken
    }

    // Separate cancelled events for batch deletion
    const cancelledEventIds: string[] = []
    const validEvents: Array<{
      id: string
      summary: string | undefined
      description: string | null
      location: string | null
      start: string
      end: string
      allDay: boolean
      recurringEventId: string | undefined
      etag: string | null
    }> = []

    // Process items to separate cancelled vs valid events
    for (const item of items) {
      if (!item.id) {
        console.warn('[Sync] Skipping item without ID', { summary: item.summary })
        continue
      }

      if (item.status === 'cancelled') {
        cancelledEventIds.push(item.id)
        continue
      }

      const start = item.start?.dateTime || item.start?.date
      const end = item.end?.dateTime || item.end?.date
      if (!start || !end) {
        console.warn('[Sync] Skipping item without start/end', { googleEventId: item.id, summary: item.summary })
        continue
      }

      validEvents.push({
        id: item.id,
        summary: item.summary,
        description: item.description || null,
        location: item.location || null,
        start,
        end,
        allDay: !!item.start?.date,
        recurringEventId: item.recurringEventId,
        etag: item.etag || null,
      })
    }

    // Batch delete cancelled events
    if (cancelledEventIds.length > 0) {
      const deleteResult = await prisma.event.deleteMany({
        where: {
          userId,
          googleEventId: { in: cancelledEventIds } as any,
        } as any,
      })
      deleted += deleteResult.count
      console.log(`[Sync] Batch deleted ${deleteResult.count} cancelled events`)
    }

    // Batch fetch existing events
    const existingEvents = await prisma.event.findMany({
      where: {
        userId,
        googleEventId: { in: validEvents.map(e => e.id) } as any,
      } as any,
      select: { id: true, googleEventId: true },
    })
    const existingMap = new Map(existingEvents.map(e => [e.googleEventId as string, e.id]))

    // Batch upsert events with concurrency limit
    const BATCH_SIZE = 20
    for (let i = 0; i < validEvents.length; i += BATCH_SIZE) {
      const batch = validEvents.slice(i, i + BATCH_SIZE)
      await Promise.allSettled(
        batch.map(async (event) => {
          try {
            const startDate = event.allDay ? normalizeAllDayDate(event.start) : new Date(event.start)
            const endDate = event.allDay ? normalizeAllDayDate(event.end) : new Date(event.end)
            const existingId = existingMap.get(event.id)

            const eventData = {
              title: event.summary || 'Untitled event',
              description: event.description,
              location: event.location,
              startTime: startDate,
              endTime: endDate,
              allDay: event.allDay,
              isRecurring: !!event.recurringEventId,
              googleCalendarId: calendarId,
              googleEtag: event.etag,
            } as any

            if (existingId) {
              await prisma.event.update({
                where: { id: existingId },
                data: eventData,
              })
              updated++
            } else {
              await prisma.event.create({
                data: {
                  ...eventData,
                  userId,
                  googleEventId: event.id,
                  isFocusBlock: false,
                },
              })
              created++
            }
          } catch (err) {
            console.error(`[Sync] Failed to upsert event ${event.id}`, {
              error: err instanceof Error ? err.message : String(err),
              title: event.summary,
            })
            throw err
          }
        })
      )
    }

    if (validEvents.length > 0) {
      console.log(`[Sync] Page ${pageCount}: Processed ${validEvents.length} events (${created} created, ${updated} updated)`)
    }
  } while (pageToken)

  const duration = Date.now() - startTime
  console.log('[Sync] Google sync complete', {
    calendarId,
    totalEventsFetched: total,
    pagesProcessed: pageCount,
    created,
    updated,
    deleted,
    usedSyncToken: !!syncToken && !forceFull,
    forceFull,
    channelId: channelId || null,
    nextSyncTokenSet: !!nextSyncToken,
    nextSyncToken: nextSyncToken?.substring(0, 20) + '...' || null,
    durationMs: duration,
    durationSeconds: (duration / 1000).toFixed(2),
  })

  if (nextSyncToken && channelId) {
    await (prisma as any).googleChannel.update({
      where: { channelId },
      data: { syncToken: nextSyncToken } as any,
    })
    console.log('[Sync] Updated syncToken in channel', { channelId })
  } else if (nextSyncToken && !channelId) {
    console.warn('[Sync] Got nextSyncToken but no channelId to store it', { nextSyncToken: nextSyncToken.substring(0, 20) + '...' })
  } else if (!nextSyncToken && syncToken) {
    console.warn('[Sync] No nextSyncToken received but had syncToken - sync may have failed or returned no changes')
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

