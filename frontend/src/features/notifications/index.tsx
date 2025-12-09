// path: src/features/notifications/index.tsx

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  Trash2,
  Calendar,
  ListTodo,
  Target,
  Repeat,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { notificationsApi, type Notification } from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function Notifications() {
  const queryClient = useQueryClient()

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await notificationsApi.list()
      return data
    },
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      toast.success('All notifications marked as read')
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const snoozeMutation = useMutation({
    mutationFn: ({ id, minutes }: { id: string; minutes: number }) =>
      notificationsApi.snooze(id, minutes),
    onSuccess: () => {
      toast.success('Notification snoozed')
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const clearAllMutation = useMutation({
    mutationFn: () => notificationsApi.clearAll(),
    onSuccess: () => {
      toast.success('All notifications cleared')
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const unreadCount = notifications.filter((n) => !n.read).length

  const getIcon = (type: string) => {
    switch (type) {
      case 'REMINDER':
        return <Calendar className='h-4 w-4' />
      case 'TASK_DUE':
        return <ListTodo className='h-4 w-4' />
      case 'HABIT_REMINDER':
        return <Repeat className='h-4 w-4' />
      case 'GOAL_UPDATE':
        return <Target className='h-4 w-4' />
      default:
        return <Bell className='h-4 w-4' />
    }
  }

  return (
    <>
      <Header>
        <div className='flex items-center gap-2'>
          <h1 className='text-lg font-semibold'>Notifications</h1>
          {unreadCount > 0 && (
            <Badge variant='secondary'>{unreadCount} unread</Badge>
          )}
        </div>
        <div className='ms-auto flex items-center space-x-4'>
          {unreadCount > 0 && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => markAllReadMutation.mutate()}
            >
              <CheckCheck className='mr-1 h-4 w-4' />
              Mark all read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant='outline'
              size='sm'
              onClick={() => clearAllMutation.mutate()}
            >
              <Trash2 className='mr-1 h-4 w-4' />
              Clear all
            </Button>
          )}
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        {notifications.length === 0 ? (
          <Card className='flex flex-col items-center justify-center py-12'>
            <Bell className='text-muted-foreground mb-4 h-12 w-12' />
            <h3 className='mb-2 text-lg font-medium'>No notifications</h3>
            <p className='text-muted-foreground'>
              You're all caught up! New notifications will appear here.
            </p>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>All Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className='h-[600px]'>
                <div className='space-y-2'>
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkRead={() => markReadMutation.mutate(notification.id)}
                      onSnooze={(minutes) =>
                        snoozeMutation.mutate({ id: notification.id, minutes })
                      }
                      onDelete={() => deleteMutation.mutate(notification.id)}
                      getIcon={getIcon}
                    />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </Main>
    </>
  )
}

interface NotificationItemProps {
  notification: Notification
  onMarkRead: () => void
  onSnooze: (minutes: number) => void
  onDelete: () => void
  getIcon: (type: string) => React.ReactNode
}

function NotificationItem({
  notification,
  onMarkRead,
  onSnooze,
  onDelete,
  getIcon,
}: NotificationItemProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-4',
        !notification.read && 'bg-muted/50'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full',
          !notification.read ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {getIcon(notification.type)}
      </div>

      <div className='flex-1'>
        <div className='flex items-start justify-between'>
          <div>
            <h4 className='font-medium'>{notification.title}</h4>
            <p className='text-muted-foreground text-sm'>{notification.message}</p>
          </div>
          <div className='flex items-center gap-1'>
            {!notification.read && (
              <Button variant='ghost' size='icon' onClick={onMarkRead}>
                <Check className='h-4 w-4' />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' size='icon'>
                  <Clock className='h-4 w-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuItem onClick={() => onSnooze(10)}>
                  Snooze 10 minutes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSnooze(60)}>
                  Snooze 1 hour
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSnooze(60 * 24)}>
                  Snooze until tomorrow
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant='ghost' size='icon' onClick={onDelete}>
              <Trash2 className='h-4 w-4' />
            </Button>
          </div>
        </div>
        <p className='text-muted-foreground mt-1 text-xs'>
          {formatDistanceToNow(new Date(notification.createdAt), {
            addSuffix: true,
          })}
        </p>
      </div>
    </div>
  )
}

export default Notifications
