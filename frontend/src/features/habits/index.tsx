// path: src/features/habits/index.tsx

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  subWeeks,
  addWeeks,
  startOfMonth,
  endOfMonth,
  differenceInDays,
  subDays,
} from 'date-fns'
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Check,
  MoreHorizontal,
  Edit,
  Trash2,
  Flame,
  ChevronDown,
  TrendingUp,
  Target,
  Award,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { habitsApi, type Habit, type HabitLog } from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { HabitForm } from './components/habit-form'

export function Habits() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [expandedHabits, setExpandedHabits] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekEnd = addDays(weekStart, 6)

  const { data: habits = [] } = useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
      const { data } = await habitsApi.list()
      return data
    },
  })

  // Fetch logs for all habits in the current week
  const { data: habitsWithLogs = [] } = useQuery({
    queryKey: ['habits', 'withLogs', weekStart.toISOString()],
    queryFn: async () => {
      const habitsData = await Promise.all(
        habits.map(async (habit) => {
          try {
            const { data } = await habitsApi.get(
              habit.id,
              weekStart.toISOString(),
              weekEnd.toISOString()
            )
            return data
          } catch {
            return { ...habit, logs: [] }
          }
        })
      )
      return habitsData
    },
    enabled: habits.length > 0,
  })

  const logMutation = useMutation({
    mutationFn: ({ habitId, date }: { habitId: string; date: string }) =>
      habitsApi.log(habitId, { date }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits', 'withLogs'] })
    },
  })

  const deleteLogMutation = useMutation({
    mutationFn: ({ habitId, date }: { habitId: string; date: string }) =>
      habitsApi.deleteLog(habitId, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits', 'withLogs'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => habitsApi.delete(id),
    onSuccess: () => {
      toast.success('Habit deleted')
      queryClient.invalidateQueries({ queryKey: ['habits'] })
    },
  })

  const handleToggleLog = (habitId: string, date: Date, isCompleted: boolean) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    if (isCompleted) {
      deleteLogMutation.mutate({ habitId, date: dateStr })
    } else {
      logMutation.mutate({ habitId, date: dateStr })
    }
  }

  const handleAddHabit = () => {
    setEditingHabit(null)
    setIsFormOpen(true)
  }

  const handleEditHabit = (habit: Habit) => {
    setEditingHabit(habit)
    setIsFormOpen(true)
  }

  const handleHabitSaved = () => {
    setIsFormOpen(false)
    setEditingHabit(null)
    queryClient.invalidateQueries({ queryKey: ['habits'] })
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    setWeekStart((current) =>
      direction === 'prev' ? subWeeks(current, 1) : addWeeks(current, 1)
    )
  }

  const goToCurrentWeek = () => {
    setWeekStart(startOfWeek(new Date()))
  }

  const toggleHabitExpanded = (habitId: string) => {
    setExpandedHabits((prev) => {
      const next = new Set(prev)
      if (next.has(habitId)) {
        next.delete(habitId)
      } else {
        next.add(habitId)
      }
      return next
    })
  }

  // Calculate habit statistics
  const calculateHabitStats = (habit: Habit & { logs?: HabitLog[] }) => {
    const logs = habit.logs || []
    const now = new Date()
    
    // Calculate current streak
    let currentStreak = 0
    let checkDate = now
    
    for (let i = 0; i < 365; i++) {
      const dateStr = format(checkDate, 'yyyy-MM-dd')
      const hasLog = logs.some(
        (log) => format(new Date(log.date), 'yyyy-MM-dd') === dateStr && log.completed
      )
      
      if (hasLog) {
        currentStreak++
        checkDate = subDays(checkDate, 1)
      } else {
        break
      }
    }
    
    // Calculate completion rate based on frequency
    let completionRate = 0
    let periodsCompleted = 0
    let totalPeriods = 0
    
    if (habit.frequency === 'DAILY') {
      // Last 30 days
      const daysToCheck = 30
      let completedDays = 0
      
      for (let i = 0; i < daysToCheck; i++) {
        const checkDate = subDays(now, i)
        const dateStr = format(checkDate, 'yyyy-MM-dd')
        const hasLog = logs.some(
          (log) => format(new Date(log.date), 'yyyy-MM-dd') === dateStr && log.completed
        )
        if (hasLog) completedDays++
      }
      
      completionRate = (completedDays / daysToCheck) * 100
      periodsCompleted = completedDays
      totalPeriods = daysToCheck
    } else if (habit.frequency === 'WEEKLY') {
      // Last 12 weeks
      const weeksToCheck = 12
      
      for (let i = 0; i < weeksToCheck; i++) {
        const weekStartDate = subWeeks(startOfWeek(now), i)
        
        let weekCompleted = false
        for (let d = 0; d < 7; d++) {
          const checkDate = addDays(weekStartDate, d)
          const dateStr = format(checkDate, 'yyyy-MM-dd')
          const hasLog = logs.some(
            (log) => format(new Date(log.date), 'yyyy-MM-dd') === dateStr && log.completed
          )
          if (hasLog) {
            weekCompleted = true
            break
          }
        }
        
        if (weekCompleted) periodsCompleted++
      }
      
      totalPeriods = weeksToCheck
      completionRate = (periodsCompleted / totalPeriods) * 100
    } else if (habit.frequency === 'MONTHLY') {
      // Last 6 months
      const monthsToCheck = 6
      
      for (let i = 0; i < monthsToCheck; i++) {
        const monthStart = startOfMonth(subWeeks(now, i * 4))
        const monthEnd = endOfMonth(monthStart)
        const daysInMonth = differenceInDays(monthEnd, monthStart) + 1
        
        let monthCompleted = false
        for (let d = 0; d < daysInMonth; d++) {
          const checkDate = addDays(monthStart, d)
          const dateStr = format(checkDate, 'yyyy-MM-dd')
          const hasLog = logs.some(
            (log) => format(new Date(log.date), 'yyyy-MM-dd') === dateStr && log.completed
          )
          if (hasLog) {
            monthCompleted = true
            break
          }
        }
        
        if (monthCompleted) periodsCompleted++
      }
      
      totalPeriods = monthsToCheck
      completionRate = (periodsCompleted / totalPeriods) * 100
    }
    
    // Calculate best streak (simplified - looking at logs)
    let bestStreak = currentStreak
    let tempStreak = 0
    const sortedLogs = [...logs]
      .filter((log) => log.completed)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    for (let i = 0; i < sortedLogs.length; i++) {
      if (i === 0) {
        tempStreak = 1
      } else {
        const prevDate = new Date(sortedLogs[i - 1].date)
        const currDate = new Date(sortedLogs[i].date)
        const daysDiff = differenceInDays(prevDate, currDate)
        
        if (daysDiff === 1) {
          tempStreak++
        } else {
          if (tempStreak > bestStreak) bestStreak = tempStreak
          tempStreak = 1
        }
      }
    }
    
    if (tempStreak > bestStreak) bestStreak = tempStreak
    
    return {
      currentStreak,
      bestStreak,
      completionRate: Math.round(completionRate),
      periodsCompleted,
      totalPeriods,
    }
  }

  return (
    <>
      <Header>
        <div className='flex items-center gap-4'>
          <h1 className='text-lg font-semibold'>Habits</h1>
          <div className='flex items-center gap-1'>
            <Button variant='outline' size='icon' onClick={() => navigateWeek('prev')}>
              <ChevronLeft className='h-4 w-4' />
            </Button>
            <Button variant='outline' onClick={goToCurrentWeek}>
              This Week
            </Button>
            <Button variant='outline' size='icon' onClick={() => navigateWeek('next')}>
              <ChevronRight className='h-4 w-4' />
            </Button>
          </div>
          <span className='text-muted-foreground text-sm'>
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </span>
        </div>
        <div className='ms-auto flex items-center space-x-4'>
          <Button onClick={handleAddHabit}>
            <Plus className='mr-1 h-4 w-4' />
            Add Habit
          </Button>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        {habits.length === 0 ? (
          <Card className='flex flex-col items-center justify-center py-12'>
            <Flame className='text-muted-foreground mb-4 h-12 w-12' />
            <h3 className='mb-2 text-lg font-medium'>No habits yet</h3>
            <p className='text-muted-foreground mb-4'>
              Create your first habit to start tracking
            </p>
            <Button onClick={handleAddHabit}>
              <Plus className='mr-1 h-4 w-4' />
              Add Habit
            </Button>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Weekly Tracker</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Header Row */}
              <div className='mb-4 grid grid-cols-[1fr_repeat(7,_48px)] gap-2'>
                <div /> {/* Empty cell for habit name column */}
                {weekDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'text-center text-sm',
                      isSameDay(day, new Date()) && 'font-bold text-primary'
                    )}
                  >
                    <div className='text-muted-foreground text-xs'>
                      {format(day, 'EEE')}
                    </div>
                    <div>{format(day, 'd')}</div>
                  </div>
                ))}
              </div>

              {/* Habit Rows */}
              <div className='space-y-2'>
                {(habitsWithLogs.length > 0 ? habitsWithLogs : habits).map((habit) => {
                  const logs = ('logs' in habit ? habit.logs : []) as HabitLog[]
                  const stats = calculateHabitStats({ ...habit, logs })
                  const isExpanded = expandedHabits.has(habit.id)
                  
                  return (
                    <Collapsible
                      key={habit.id}
                      open={isExpanded}
                      onOpenChange={() => toggleHabitExpanded(habit.id)}
                    >
                      <div className='rounded-lg border'>
                        <div className='grid grid-cols-[1fr_repeat(7,_48px)] items-center gap-2 p-2'>
                          <div className='flex items-center gap-2'>
                            <CollapsibleTrigger asChild>
                              <Button
                                variant='ghost'
                                size='icon'
                                className='h-6 w-6 shrink-0'
                              >
                                <ChevronDown
                                  className={cn(
                                    'h-4 w-4 transition-transform',
                                    isExpanded && 'rotate-180'
                                  )}
                                />
                              </Button>
                            </CollapsibleTrigger>
                            <div
                              className='h-4 w-4 shrink-0 rounded-full'
                              style={{ backgroundColor: habit.color }}
                            />
                            <span className='font-medium'>{habit.name}</span>
                            <Badge variant='outline' className='text-xs'>
                              {habit.frequency.toLowerCase()}
                            </Badge>
                            {stats.currentStreak > 0 && (
                              <Badge variant='secondary' className='text-xs'>
                                <Flame className='mr-1 h-3 w-3' />
                                {stats.currentStreak}
                              </Badge>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant='ghost' size='icon' className='ml-auto h-6 w-6'>
                                  <MoreHorizontal className='h-4 w-4' />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align='end'>
                                <DropdownMenuItem onClick={() => handleEditHabit(habit)}>
                                  <Edit className='mr-2 h-4 w-4' />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => deleteMutation.mutate(habit.id)}
                                  className='text-destructive'
                                >
                                  <Trash2 className='mr-2 h-4 w-4' />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {weekDays.map((day) => {
                            const dateStr = format(day, 'yyyy-MM-dd')
                            const log = logs?.find(
                              (l: HabitLog) => format(new Date(l.date), 'yyyy-MM-dd') === dateStr
                            )
                            const isCompleted = !!log?.completed

                            return (
                              <button
                                key={day.toISOString()}
                                onClick={() => handleToggleLog(habit.id, day, isCompleted)}
                                className={cn(
                                  'flex h-10 w-10 items-center justify-center rounded-lg border transition-colors',
                                  isCompleted
                                    ? 'border-transparent text-white'
                                    : 'hover:bg-muted'
                                )}
                                style={{
                                  backgroundColor: isCompleted ? habit.color : undefined,
                                }}
                              >
                                {isCompleted && <Check className='h-5 w-5' />}
                              </button>
                            )
                          })}
                        </div>

                        <CollapsibleContent>
                          <div className='border-t bg-muted/30 p-4'>
                            <div className='mb-3 grid grid-cols-2 gap-4 md:grid-cols-4'>
                              <div className='space-y-1'>
                                <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                                  <Flame className='h-3 w-3' />
                                  Current Streak
                                </div>
                                <div className='text-2xl font-bold'>{stats.currentStreak}</div>
                                <div className='text-xs text-muted-foreground'>
                                  {stats.currentStreak === 1 ? 'day' : 'days'}
                                </div>
                              </div>

                              <div className='space-y-1'>
                                <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                                  <Award className='h-3 w-3' />
                                  Best Streak
                                </div>
                                <div className='text-2xl font-bold'>{stats.bestStreak}</div>
                                <div className='text-xs text-muted-foreground'>
                                  {stats.bestStreak === 1 ? 'day' : 'days'}
                                </div>
                              </div>

                              <div className='space-y-1'>
                                <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                                  <TrendingUp className='h-3 w-3' />
                                  Consistency
                                </div>
                                <div className='text-2xl font-bold'>{stats.completionRate}%</div>
                                <div className='text-xs text-muted-foreground'>
                                  last {habit.frequency === 'DAILY' ? '30 days' : habit.frequency === 'WEEKLY' ? '12 weeks' : '6 months'}
                                </div>
                              </div>

                              <div className='space-y-1'>
                                <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                                  <Target className='h-3 w-3' />
                                  Periods Completed
                                </div>
                                <div className='text-2xl font-bold'>
                                  {stats.periodsCompleted}/{stats.totalPeriods}
                                </div>
                                <div className='text-xs text-muted-foreground'>
                                  {habit.frequency.toLowerCase()}
                                </div>
                              </div>
                            </div>

                            <div className='mt-3 rounded-md bg-muted p-3 flex items-center justify-between'>
                              <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                                <TrendingUp className='h-4 w-4' />
                                Consistency (last {habit.frequency === 'DAILY' ? '30 days' : habit.frequency === 'WEEKLY' ? '12 weeks' : '6 months'})
                              </div>
                              <span className='text-lg font-semibold'>{stats.completionRate}%</span>
                            </div>

                            {habit.description && (
                              <div className='mt-3 rounded-md bg-muted p-2'>
                                <div className='text-xs font-medium text-muted-foreground mb-1'>
                                  Description
                                </div>
                                <div className='text-sm'>{habit.description}</div>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </Main>

      {/* Habit Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>
              {editingHabit ? 'Edit Habit' : 'New Habit'}
            </DialogTitle>
          </DialogHeader>
          <HabitForm
            habit={editingHabit}
            onSaved={handleHabitSaved}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

export default Habits
