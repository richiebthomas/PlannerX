// path: src/features/calendar/index.tsx

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  subDays,
  subWeeks,
  subMonths,
  isSameDay,
  isSameMonth,
  eachDayOfInterval,
  eachHourOfInterval,
  setHours,
  getHours,
  getMinutes,
  differenceInMinutes,
  parseISO,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
// Removed unused Card imports
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'

import { eventsApi, type Event } from '@/lib/api'
import { cn } from '@/lib/utils'
import { EventForm } from './components/event-form'
import { EventDetails } from './components/event-details'

type CalendarView = 'day' | 'week' | 'month'

interface CalendarProps {
  view: CalendarView
}

export function Calendar({ view }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formDefaultDate, setFormDefaultDate] = useState<Date | null>(null)
  const queryClient = useQueryClient()

  const { start, end } = useMemo(() => {
    switch (view) {
      case 'day':
        return { start: startOfDay(currentDate), end: endOfDay(currentDate) }
      case 'week':
        return { start: startOfWeek(currentDate), end: endOfWeek(currentDate) }
      case 'month':
        return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) }
    }
  }, [view, currentDate])

  const { data: events = [] } = useQuery({
    queryKey: ['events', view, start.toISOString()],
    queryFn: async () => {
      // For month view, get a bit extra to show events that span weeks
      const queryStart = view === 'month' ? startOfWeek(start) : start
      const queryEnd = view === 'month' ? endOfWeek(end) : end
      const { data } = await eventsApi.list({
        start: queryStart.toISOString(),
        end: queryEnd.toISOString(),
      })
      return data
    },
  })

  const navigate = (direction: 'prev' | 'next') => {
    const fn = direction === 'prev' 
      ? view === 'day' ? subDays : view === 'week' ? subWeeks : subMonths
      : view === 'day' ? addDays : view === 'week' ? addWeeks : addMonths
    setCurrentDate(fn(currentDate, 1))
  }

  const goToToday = () => setCurrentDate(new Date())

  const handleAddEvent = (date?: Date) => {
    setFormDefaultDate(date || new Date())
    setSelectedEvent(null)
    setIsFormOpen(true)
  }

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event)
  }

  const handleEventSaved = () => {
    setIsFormOpen(false)
    setSelectedEvent(null)
    queryClient.invalidateQueries({ queryKey: ['events'] })
  }

  const title = useMemo(() => {
    switch (view) {
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy')
      case 'week':
        return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
      case 'month':
        return format(currentDate, 'MMMM yyyy')
    }
  }, [view, currentDate, start, end])

  return (
    <>
      <Header>
        <div className='flex items-center gap-4'>
          <h1 className='text-lg font-semibold capitalize'>{view} View</h1>
          <div className='flex items-center gap-1'>
            <Button variant='outline' size='icon' onClick={() => navigate('prev')}>
              <ChevronLeft className='h-4 w-4' />
            </Button>
            <Button variant='outline' onClick={goToToday}>
              Today
            </Button>
            <Button variant='outline' size='icon' onClick={() => navigate('next')}>
              <ChevronRight className='h-4 w-4' />
            </Button>
          </div>
          <span className='text-muted-foreground text-sm'>{title}</span>
        </div>
        <div className='ms-auto flex items-center space-x-4'>
          <Button onClick={() => handleAddEvent()}>
            <Plus className='mr-1 h-4 w-4' />
            Add Event
          </Button>

        </div>
      </Header>

      <Main className='flex flex-col'>
        <div className='flex-1 overflow-hidden'>
          {view === 'day' && (
            <DayView
              date={currentDate}
              events={events}
              onEventClick={handleEventClick}
              onAddEvent={handleAddEvent}
            />
          )}
          {view === 'week' && (
            <WeekView
              startDate={start}
              events={events}
              onEventClick={handleEventClick}
              onAddEvent={handleAddEvent}
            />
          )}
          {view === 'month' && (
            <MonthView
              currentDate={currentDate}
              events={events}
              onEventClick={handleEventClick}
              onAddEvent={handleAddEvent}
            />
          )}
        </div>
      </Main>

      {/* Event Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>
              {selectedEvent ? 'Edit Event' : 'New Event'}
            </DialogTitle>
          </DialogHeader>
          <EventForm
            event={selectedEvent}
            defaultDate={formDefaultDate}
            onSaved={handleEventSaved}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent && !isFormOpen} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <EventDetails
              event={selectedEvent}
              onEdit={() => setIsFormOpen(true)}
              onDeleted={() => {
                setSelectedEvent(null)
                queryClient.invalidateQueries({ queryKey: ['events'] })
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// Day View Component
function DayView({
  date,
  events,
  onEventClick,
  onAddEvent,
}: {
  date: Date
  events: Event[]
  onEventClick: (event: Event) => void
  onAddEvent: (date: Date) => void
}) {
  const hours = eachHourOfInterval({
    start: setHours(date, 0),
    end: setHours(date, 23),
  })

  const dayEvents = events.filter((e) => {
    const eventDate = parseISO(e.startTime)
    return isSameDay(eventDate, date)
  })

  const allDayEvents = dayEvents.filter((e) => e.allDay)
  const timedEvents = dayEvents.filter((e) => !e.allDay)

  return (
    <ScrollArea className='h-full'>
      <div className='min-w-[600px]'>
        {/* All-day events */}
        {allDayEvents.length > 0 && (
          <div className='border-b p-2'>
            <div className='text-muted-foreground mb-1 text-xs'>All Day</div>
            <div className='flex flex-wrap gap-1'>
              {allDayEvents.map((event) => (
                <Badge
                  key={event.id}
                  variant='secondary'
                  className='cursor-pointer'
                  style={{ backgroundColor: event.color || event.category?.color || '#3B82F6', color: 'white' }}
                  onClick={() => onEventClick(event)}
                >
                  {event.title}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Time grid */}
        <div className='relative'>
          {hours.map((hour) => (
            <div
              key={hour.toISOString()}
              className='group flex h-16 border-b'
              onClick={() => onAddEvent(hour)}
            >
              <div className='text-muted-foreground w-16 flex-shrink-0 border-r p-1 text-xs'>
                {format(hour, 'h a')}
              </div>
              <div className='relative flex-1 cursor-pointer group-hover:bg-muted/50'>
                {/* Render events for this hour */}
                {timedEvents
                  .filter((e) => getHours(parseISO(e.startTime)) === getHours(hour))
                  .map((event) => {
                    const startMinutes = getMinutes(parseISO(event.startTime))
                    const duration = differenceInMinutes(
                      parseISO(event.endTime),
                      parseISO(event.startTime)
                    )
                    return (
                      <div
                        key={event.id}
                        className='absolute left-1 right-1 cursor-pointer overflow-hidden rounded px-2 py-1 text-xs text-white'
                        style={{
                          backgroundColor: event.color || event.category?.color || '#3B82F6',
                          top: `${(startMinutes / 60) * 100}%`,
                          height: `${Math.max((duration / 60) * 64, 20)}px`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onEventClick(event)
                        }}
                      >
                        <div className='font-medium'>{event.title}</div>
                        <div className='opacity-80'>
                          {format(parseISO(event.startTime), 'h:mm a')}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  )
}

// Week View Component
function WeekView({
  startDate,
  events,
  onEventClick,
  onAddEvent,
}: {
  startDate: Date
  events: Event[]
  onEventClick: (event: Event) => void
  onAddEvent: (date: Date) => void
}) {
  const days = eachDayOfInterval({
    start: startDate,
    end: addDays(startDate, 6),
  })

  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <ScrollArea className='h-full'>
      <div className='min-w-[800px]'>
        {/* Header with day names */}
        <div className='sticky top-0 z-10 flex border-b bg-background'>
          <div className='w-16 flex-shrink-0 border-r' />
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                'flex-1 border-r p-2 text-center',
                isSameDay(day, new Date()) && 'bg-primary/10'
              )}
            >
              <div className='text-muted-foreground text-xs'>
                {format(day, 'EEE')}
              </div>
              <div className={cn(
                'text-lg font-semibold',
                isSameDay(day, new Date()) && 'text-primary'
              )}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className='relative'>
          {hours.map((hour) => (
            <div key={hour} className='flex h-12 border-b'>
              <div className='text-muted-foreground w-16 flex-shrink-0 border-r p-1 text-xs'>
                {format(setHours(new Date(), hour), 'h a')}
              </div>
              {days.map((day) => {
                const dayEvents = events.filter((e) => {
                  const eventStart = parseISO(e.startTime)
                  return (
                    isSameDay(eventStart, day) &&
                    getHours(eventStart) === hour &&
                    !e.allDay
                  )
                })

                return (
                  <div
                    key={day.toISOString()}
                    className='relative flex-1 cursor-pointer border-r hover:bg-muted/50'
                    onClick={() => onAddEvent(setHours(day, hour))}
                  >
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        className='absolute inset-x-0.5 cursor-pointer overflow-hidden rounded px-1 text-xs text-white'
                        style={{
                          backgroundColor: event.color || event.category?.color || '#3B82F6',
                          top: `${(getMinutes(parseISO(event.startTime)) / 60) * 100}%`,
                          height: `${Math.max(
                            (differenceInMinutes(parseISO(event.endTime), parseISO(event.startTime)) / 60) * 48,
                            16
                          )}px`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onEventClick(event)
                        }}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  )
}

// Month View Component
function MonthView({
  currentDate,
  events,
  onEventClick,
  onAddEvent,
}: {
  currentDate: Date
  events: Event[]
  onEventClick: (event: Event) => void
  onAddEvent: (date: Date) => void
}) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  const weeks = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  return (
    <div className='flex h-full flex-col'>
      {/* Header with day names */}
      <div className='grid grid-cols-7 border-b'>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className='text-muted-foreground p-2 text-center text-sm font-medium'
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className='grid flex-1 grid-cols-7'>
        {weeks.flat().map((day) => {
          const dayEvents = events.filter((e) =>
            isSameDay(parseISO(e.startTime), day)
          )
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isToday = isSameDay(day, new Date())

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'min-h-[100px] cursor-pointer border-b border-r p-1 transition-colors hover:bg-muted/50',
                !isCurrentMonth && 'bg-muted/30'
              )}
              onClick={() => onAddEvent(day)}
            >
              <div
                className={cn(
                  'mb-1 flex h-6 w-6 items-center justify-center rounded-full text-sm',
                  isToday && 'bg-primary text-primary-foreground'
                )}
              >
                {format(day, 'd')}
              </div>
              <div className='space-y-0.5'>
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className='cursor-pointer truncate rounded px-1 text-xs text-white'
                    style={{
                      backgroundColor: event.color || event.category?.color || '#3B82F6',
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEventClick(event)
                    }}
                  >
                    {event.allDay ? event.title : `${format(parseISO(event.startTime), 'h:mm')} ${event.title}`}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className='text-muted-foreground text-xs'>
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Calendar
