import { useEffect, useMemo, useState } from 'react'
import { Loader2, CheckCircle2, Link as LinkIcon, RefreshCw, Unlink, CloudDownload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { googleApi, type GoogleCalendarListItem } from '@/lib/api'
import { toast } from 'sonner'

export function GoogleCalendarConnect() {
  const [loading, setLoading] = useState(false)
  const [calendars, setCalendars] = useState<GoogleCalendarListItem[]>([])
  const [selectedCalendar, setSelectedCalendar] = useState<string>('')
  const [connected, setConnected] = useState<boolean | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [lastWatchedCalendar, setLastWatchedCalendar] = useState<string>('')

  const primaryCalendarId = useMemo(
    () => calendars.find((c) => c.primary)?.id || calendars[0]?.id || '',
    [calendars]
  )

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('google') === 'connected') {
      toast.success('Google Calendar connected')
      params.delete('google')
      const newUrl = `${window.location.pathname}?${params.toString()}`
      window.history.replaceState({}, document.title, newUrl)
    }
    fetchCalendars()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchCalendars = async () => {
    setLoading(true)
    try {
      const { data } = await googleApi.listCalendars()
      setCalendars(data.items || [])
      setConnected(true)
      if (!selectedCalendar && data.items?.length) {
        setSelectedCalendar(data.items.find((c) => c.primary)?.id || data.items[0].id || '')
      }
    } catch {
      setConnected(false)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    try {
      const { data } = await googleApi.getAuthUrl()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error('Failed to start Google OAuth')
      }
    } catch {
      toast.error('Failed to start Google OAuth')
    }
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      await googleApi.disconnect()
      setConnected(false)
      setCalendars([])
      setSelectedCalendar('')
      toast.success('Google Calendar disconnected')
    } catch {
      toast.error('Failed to disconnect')
    } finally {
      setDisconnecting(false)
    }
  }

  const handleSyncNow = async () => {
    setSyncing(true)
    try {
      await googleApi.syncNow()
      toast.success('Synced from Google')
    } catch {
      toast.error('Failed to sync now')
    } finally {
      setSyncing(false)
    }
  }

  // Auto-enable real-time sync when connected and calendar is selected
  useEffect(() => {
    const run = async () => {
      if (!connected || !selectedCalendar) return
      if (lastWatchedCalendar === selectedCalendar) return
      try {
        await googleApi.startWatch(selectedCalendar)
        setLastWatchedCalendar(selectedCalendar)
        toast.success('Real-time sync enabled')
      } catch {
        toast.error('Failed to enable real-time sync')
      }
    }
    void run()
  }, [connected, selectedCalendar, lastWatchedCalendar])

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <LinkIcon className='h-4 w-4' />
          Google Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {connected === false ? (
          <div className='flex items-center justify-between gap-2'>
            <div className='text-sm text-muted-foreground'>
              Not connected. Connect to enable two-way calendar sync.
            </div>
            <Button onClick={handleConnect} disabled={loading}>
              {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              Connect
            </Button>
          </div>
        ) : (
          <>
            <div className='flex flex-wrap items-center gap-3'>
              <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                <CheckCircle2 className='h-4 w-4 text-green-500' />
                Connected (real-time sync auto-enabled)
              </div>
              <Button variant='outline' size='sm' onClick={fetchCalendars} disabled={loading}>
                <RefreshCw className='mr-2 h-4 w-4' />
                Refresh
              </Button>
              <Button variant='outline' size='sm' onClick={handleSyncNow} disabled={syncing}>
                {syncing ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <CloudDownload className='mr-2 h-4 w-4' />
                )}
                Sync now
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={handleDisconnect}
                disabled={disconnecting}
                className='text-destructive hover:text-destructive'
              >
                {disconnecting ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <Unlink className='mr-2 h-4 w-4' />
                )}
                Disconnect
              </Button>
            </div>

            <div className='space-y-2'>
              <div className='text-sm font-medium'>Select calendar</div>
              <Select
                value={selectedCalendar || primaryCalendarId}
                onValueChange={(v) => setSelectedCalendar(v)}
                disabled={loading || !calendars.length}
              >
                <SelectTrigger className='w-[260px]'>
                  <SelectValue placeholder='Choose a calendar' />
                </SelectTrigger>
                <SelectContent>
                  {calendars.map((cal) => (
                    <SelectItem key={cal.id || ''} value={cal.id || ''}>
                      {cal.summary || cal.id}
                      {cal.primary ? ' (Primary)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className='text-sm text-muted-foreground'>
              Real-time sync is automatically enabled for the selected calendar.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

