// path: src/features/calendar/components/event-details.tsx

import { useMutation } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { Calendar, Clock, MapPin, Trash2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { eventsApi, type Event } from '@/lib/api'
import { toast } from 'sonner'

interface EventDetailsProps {
  event: Event
  onEdit: () => void
  onDeleted: () => void
}

export function EventDetails({ event, onEdit, onDeleted }: EventDetailsProps) {
  const deleteMutation = useMutation({
    mutationFn: () => eventsApi.delete(event.id),
    onSuccess: () => {
      toast.success('Event deleted')
      onDeleted()
    },
    onError: () => {
      toast.error('Failed to delete event')
    },
  })

  const startTime = parseISO(event.startTime)
  const endTime = parseISO(event.endTime)

  return (
    <div className='space-y-4'>
      <div className='flex items-start gap-3'>
        <div
          className='mt-1 h-4 w-4 rounded'
          style={{ backgroundColor: event.color || event.category?.color || '#3B82F6' }}
        />
        <div>
          <h3 className='font-semibold'>{event.title}</h3>
          {event.category && (
            <Badge variant='outline' className='mt-1'>
              {event.category.name}
            </Badge>
          )}
        </div>
      </div>

      {event.description && (
        <p className='text-muted-foreground text-sm'>{event.description}</p>
      )}

      <div className='space-y-2'>
        <div className='flex items-center gap-2 text-sm'>
          <Calendar className='text-muted-foreground h-4 w-4' />
          <span>
            {event.allDay ? (
              format(startTime, 'EEEE, MMMM d, yyyy')
            ) : (
              <>
                {format(startTime, 'EEEE, MMMM d, yyyy')}
              </>
            )}
          </span>
        </div>

        {!event.allDay && (
          <div className='flex items-center gap-2 text-sm'>
            <Clock className='text-muted-foreground h-4 w-4' />
            <span>
              {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
            </span>
          </div>
        )}

        {event.location && (
          <div className='flex items-center gap-2 text-sm'>
            <MapPin className='text-muted-foreground h-4 w-4' />
            <span>{event.location}</span>
          </div>
        )}
      </div>

      {event.isFocusBlock && (
        <Badge variant='secondary'>Focus Block</Badge>
      )}

      <div className='flex justify-end gap-2 border-t pt-4'>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant='destructive' size='sm'>
              <Trash2 className='mr-1 h-4 w-4' />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Event</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{event.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate()}
                className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button size='sm' onClick={onEdit}>
          <Edit className='mr-1 h-4 w-4' />
          Edit
        </Button>
      </div>
    </div>
  )
}
