// path: src/features/dashboard/index.tsx

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format, startOfDay, endOfDay } from 'date-fns'
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Target,
  TrendingUp,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { eventsApi, tasksApi, habitsApi, goalsApi, type Task, type Event, type Habit } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { MetricCardSkeleton } from '@/components/skeletons/card-skeleton'
import { TaskListSkeleton } from '@/components/skeletons/list-skeleton'
import { TaskForm } from '@/features/tasks/components/task-form'
import { EventForm } from '@/features/calendar/components/event-form'
import { HabitForm } from '@/features/habits/components/habit-form'
import { GoalForm } from '@/features/goals/components/goal-form'

export function Dashboard() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false)
  const [isEventFormOpen, setIsEventFormOpen] = useState(false)
  const [isHabitFormOpen, setIsHabitFormOpen] = useState(false)
  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false)

  // Fetch today's events
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events', 'today'],
    queryFn: async () => {
      const { data } = await eventsApi.list({
        start: startOfDay(today).toISOString(),
        end: endOfDay(today).toISOString(),
      })
      return data
    },
  })

  // Fetch all tasks for stats
  const { data: allTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', 'all'],
    queryFn: async () => {
      const { data } = await tasksApi.list({})
      return data
    },
  })

  // Filter tasks to show on dashboard
  const tasks = allTasks
    .filter(t => {
      // Only show non-completed tasks
      if (t.status === 'DONE') return false
      
      // Filter out future recurring tasks (those whose goal hasn't started yet)
      if (t.isRecurring && t.goal && t.goal.startDate) {
        const goalStartDate = new Date(t.goal.startDate)
        if (goalStartDate > today) return false
      }
      
      // Include tasks without due dates
      if (!t.dueDate) return true
      
      // Include tasks due today or overdue
      const dueDate = new Date(t.dueDate)
      return dueDate <= endOfDay(today)
    })
    .sort((a, b) => {
      // Sort by priority (HIGH > MEDIUM > LOW), then by due date
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      
      // Then by due date (earliest first), tasks without due date go last
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })
    .slice(0, 5)

  // Fetch habits
  const { data: habits = [], isLoading: habitsLoading } = useQuery({
    queryKey: ['habits', 'active'],
    queryFn: async () => {
      const { data } = await habitsApi.list(true)
      return data
    },
  })

  // Fetch active goals
  const { data: goals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ['goals', 'active'],
    queryFn: async () => {
      const { data } = await goalsApi.list({ status: 'ACTIVE' })
      return data.slice(0, 3)
    },
  })

  const greeting = () => {
    const hour = today.getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  // Calculate task stats from all tasks
  const completedTasksToday = allTasks.filter((t) => {
    if (t.status !== 'DONE' || !t.completedAt) return false
    const completedDate = new Date(t.completedAt)
    return completedDate >= startOfDay(today) && completedDate <= endOfDay(today)
  }).length

  const pendingTasks = allTasks.filter((t) => t.status !== 'DONE').length

  const handleTaskSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
    setIsTaskFormOpen(false)
  }

  const handleEventSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['events'] })
    setIsEventFormOpen(false)
  }

  const handleHabitSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['habits'] })
    setIsHabitFormOpen(false)
  }

  const handleGoalSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['goals'] })
    setIsGoalFormOpen(false)
  }

  return (
    <>
      <Header>
        <div className='flex items-center gap-2'>
          <h1 className='text-lg font-semibold'>Dashboard</h1>
        </div>
        <div className='ms-auto flex items-center space-x-4'>

        </div>
      </Header>

      <Main>
        <div className='mb-6'>
          <h2 className='text-2xl font-bold tracking-tight'>
            {greeting()}, {user?.name || 'there'}!
          </h2>
          <p className='text-muted-foreground'>
            {format(today, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {/* Stats Cards */}
        <div className='mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {eventsLoading || tasksLoading || habitsLoading || goalsLoading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>Today's Events</CardTitle>
                  <Calendar className='text-muted-foreground h-4 w-4' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>{events.length}</div>
                  <p className='text-muted-foreground text-xs'>
                    {events.filter((e) => new Date(e.startTime) > today).length} upcoming
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>Tasks Due</CardTitle>
                  <CheckCircle2 className='text-muted-foreground h-4 w-4' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>{pendingTasks}</div>
                  <p className='text-muted-foreground text-xs'>
                    {completedTasksToday} completed today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>Habits</CardTitle>
                  <TrendingUp className='text-muted-foreground h-4 w-4' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>{habits.length}</div>
                  <p className='text-muted-foreground text-xs'>
                    Active habits to track
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>Active Goals</CardTitle>
                  <Target className='text-muted-foreground h-4 w-4' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>{goals.length}</div>
                  <p className='text-muted-foreground text-xs'>
                    Goals in progress
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Main Content Grid */}
        <div className='grid gap-4 lg:grid-cols-2'>
          {/* Today's Schedule */}
          <Card className='lg:col-span-1'>
            <CardHeader className='flex flex-row items-center justify-between'>
              <div>
                <CardTitle>Today's Schedule</CardTitle>
                <CardDescription>Your events for today</CardDescription>
              </div>
              <Button size='sm' variant='outline' onClick={() => setIsEventFormOpen(true)}>
                <Plus className='mr-1 h-4 w-4' />
                Add Event
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className='h-[300px] pr-4'>
                {eventsLoading ? (
                  <TaskListSkeleton count={3} />
                ) : events.length === 0 ? (
                  <div className='text-muted-foreground flex h-full items-center justify-center py-8 text-center'>
                    <div>
                      <Calendar className='mx-auto mb-2 h-8 w-8 opacity-50' />
                      <p>No events scheduled for today</p>
                    </div>
                  </div>
                ) : (
                  <div className='space-y-3'>
                    {events.map((event) => (
                      <EventItem key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card className='lg:col-span-1'>
            <CardHeader className='flex flex-row items-center justify-between'>
              <div>
                <CardTitle>Tasks</CardTitle>
                <CardDescription>Due today and overdue</CardDescription>
              </div>
              <Button size='sm' variant='outline' onClick={() => setIsTaskFormOpen(true)}>
                <Plus className='mr-1 h-4 w-4' />
                Add Task
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className='h-[300px] pr-4'>
                {tasksLoading ? (
                  <TaskListSkeleton count={3} />
                ) : tasks.length === 0 ? (
                  <div className='text-muted-foreground flex h-full items-center justify-center py-8 text-center'>
                    <div>
                      <CheckCircle2 className='mx-auto mb-2 h-8 w-8 opacity-50' />
                      <p>No pending tasks</p>
                    </div>
                  </div>
                ) : (
                  <div className='space-y-3'>
                    {tasks.map((task) => (
                      <TaskItem key={task.id} task={task} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Habits */}
          <Card className='lg:col-span-1'>
            <CardHeader className='flex flex-row items-center justify-between'>
              <div>
                <CardTitle>Today's Habits</CardTitle>
                <CardDescription>Track your daily habits</CardDescription>
              </div>
              <Button size='sm' variant='outline' onClick={() => setIsHabitFormOpen(true)}>
                <Plus className='mr-1 h-4 w-4' />
                Add Habit
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className='h-[200px] pr-4'>
                {habitsLoading ? (
                  <TaskListSkeleton count={2} />
                ) : habits.length === 0 ? (
                  <div className='text-muted-foreground flex h-full items-center justify-center py-8 text-center'>
                    <div>
                      <TrendingUp className='mx-auto mb-2 h-8 w-8 opacity-50' />
                      <p>No habits to track</p>
                    </div>
                  </div>
                ) : (
                  <div className='space-y-3'>
                    {habits.map((habit) => (
                      <HabitItem key={habit.id} habit={habit} date={todayStr} />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Goals Progress */}
          <Card className='lg:col-span-1'>
            <CardHeader className='flex flex-row items-center justify-between'>
              <div>
                <CardTitle>Goals Progress</CardTitle>
                <CardDescription>Your active goals</CardDescription>
              </div>
              <Button size='sm' variant='outline' onClick={() => setIsGoalFormOpen(true)}>
                <Plus className='mr-1 h-4 w-4' />
                Add Goal
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className='h-[200px] pr-4'>
                {goalsLoading ? (
                  <TaskListSkeleton count={2} />
                ) : goals.length === 0 ? (
                  <div className='text-muted-foreground flex h-full items-center justify-center py-8 text-center'>
                    <div>
                      <Target className='mx-auto mb-2 h-8 w-8 opacity-50' />
                      <p>No active goals</p>
                    </div>
                  </div>
                ) : (
                  <div className='space-y-4'>
                    {goals.map((goal) => (
                      <div key={goal.id} className='space-y-2'>
                        <div className='flex items-center justify-between'>
                          <span className='font-medium'>{goal.title}</span>
                          <Badge variant='outline'>{goal.type}</Badge>
                        </div>
                        <div className='bg-secondary h-2 w-full overflow-hidden rounded-full'>
                          <div
                            className='bg-primary h-full transition-all'
                            style={{ width: `${goal.progress || 0}%` }}
                          />
                        </div>
                        <p className='text-muted-foreground text-xs'>
                          {goal.completedTasks || 0} of {goal.totalTasks || 0} tasks completed
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </Main>

      {/* Dialogs */}
      <Dialog open={isTaskFormOpen} onOpenChange={setIsTaskFormOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>
          <TaskForm
            task={null}
            onSaved={handleTaskSaved}
            onCancel={() => setIsTaskFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isEventFormOpen} onOpenChange={setIsEventFormOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>New Event</DialogTitle>
          </DialogHeader>
          <EventForm
            event={null}
            defaultDate={today}
            onSaved={handleEventSaved}
            onCancel={() => setIsEventFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isHabitFormOpen} onOpenChange={setIsHabitFormOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>New Habit</DialogTitle>
          </DialogHeader>
          <HabitForm
            habit={null}
            onSaved={handleHabitSaved}
            onCancel={() => setIsHabitFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isGoalFormOpen} onOpenChange={setIsGoalFormOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>New Goal</DialogTitle>
          </DialogHeader>
          <GoalForm
            goal={null}
            onSaved={handleGoalSaved}
            onCancel={() => setIsGoalFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

function EventItem({ event }: { event: Event }) {
  const startTime = new Date(event.startTime)
  const endTime = new Date(event.endTime)

  return (
    <div
      className='flex items-start gap-3 rounded-lg border p-3'
      style={{ borderLeftColor: event.color || event.category?.color || '#3B82F6', borderLeftWidth: 3 }}
    >
      <div className='text-muted-foreground min-w-[60px] text-sm'>
        {event.allDay ? (
          <span>All day</span>
        ) : (
          <>
            <div>{format(startTime, 'h:mm a')}</div>
            <div className='text-xs'>{format(endTime, 'h:mm a')}</div>
          </>
        )}
      </div>
      <div className='flex-1'>
        <p className='font-medium'>{event.title}</p>
        {event.location && (
          <p className='text-muted-foreground text-sm'>{event.location}</p>
        )}
        {event.isFocusBlock && (
          <Badge variant='secondary' className='mt-1'>
            Focus Block
          </Badge>
        )}
      </div>
    </div>
  )
}

function TaskItem({ task }: { task: Task }) {
  const priorityColors = {
    LOW: 'text-muted-foreground',
    MEDIUM: 'text-yellow-500',
    HIGH: 'text-red-500',
  }

  return (
    <div className='flex items-start gap-3 rounded-lg border p-3'>
      <Checkbox
        checked={task.status === 'DONE'}
        className='mt-0.5'
      />
      <div className='flex-1'>
        <p className={cn('font-medium', task.status === 'DONE' && 'line-through opacity-50')}>
          {task.title}
        </p>
        <div className='mt-1 flex items-center gap-2'>
          {task.dueDate && (
            <span className='text-muted-foreground flex items-center gap-1 text-xs'>
              <Clock className='h-3 w-3' />
              {format(new Date(task.dueDate), 'MMM d')}
            </span>
          )}
          <span className={cn('text-xs', priorityColors[task.priority])}>
            {task.priority}
          </span>
          {task.category && (
            <Badge
              variant='outline'
              style={{ borderColor: task.category.color, color: task.category.color }}
            >
              {task.category.name}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}

function HabitItem({ habit }: { habit: Habit; date: string }) {
  return (
    <div className='flex items-center gap-3 rounded-lg border p-3'>
      <div
        className='flex h-8 w-8 items-center justify-center rounded-full'
        style={{ backgroundColor: habit.color + '20' }}
      >
        <Circle className='h-4 w-4' style={{ color: habit.color }} />
      </div>
      <div className='flex-1'>
        <p className='font-medium'>{habit.name}</p>
        <p className='text-muted-foreground text-xs capitalize'>
          {habit.frequency.toLowerCase()}
        </p>
      </div>
      <Checkbox />
    </div>
  )
}
