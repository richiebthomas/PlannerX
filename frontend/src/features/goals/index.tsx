// path: src/features/goals/index.tsx

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Plus,
  Target,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle2,
  Archive,
  Repeat,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { goalsApi, type Goal } from '@/lib/api'
// Removed unused cn import
import { toast } from 'sonner'
import { GoalForm } from './components/goal-form'
import { CardSkeleton } from '@/components/skeletons/card-skeleton'

export function Goals() {
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const queryClient = useQueryClient()

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals', statusFilter],
    queryFn: async () => {
      const { data } = await goalsApi.list({ status: statusFilter || undefined })
      return data
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Goal> }) =>
      goalsApi.update(id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      
      // Check if a next goal was created (for recurring goals)
      const nextGoal = (response as any)?.data?.nextGoal
      if (nextGoal) {
        const startDate = format(new Date(nextGoal.startDate), 'MMM d')
        const endDate = format(new Date(nextGoal.endDate), 'MMM d')
        toast.success(
          `Goal completed! New goal created for ${startDate} - ${endDate}`,
          { duration: 5000 }
        )
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => goalsApi.delete(id),
    onSuccess: () => {
      toast.success('Goal deleted')
      queryClient.invalidateQueries({ queryKey: ['goals'] })
    },
  })

  const handleAddGoal = () => {
    setEditingGoal(null)
    setIsFormOpen(true)
  }

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal)
    setIsFormOpen(true)
  }

  const handleGoalSaved = () => {
    setIsFormOpen(false)
    setEditingGoal(null)
    queryClient.invalidateQueries({ queryKey: ['goals'] })
  }

  const handleMarkComplete = (goal: Goal) => {
    updateMutation.mutate({ id: goal.id, data: { status: 'COMPLETED' } })
    if (!goal.isRecurring) {
      toast.success('Goal completed!')
    }
  }

  const handleArchive = (goal: Goal) => {
    updateMutation.mutate({ id: goal.id, data: { status: 'ARCHIVED' } })
    toast.success('Goal archived')
  }

  const typeColors: Record<string, string> = {
    DAILY: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-400',
    WEEKLY: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400',
    MONTHLY: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-400',
    YEARLY: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-400',
  }

  return (
    <>
      <Header>
        <div className='flex items-center gap-2'>
          <h1 className='text-lg font-semibold'>Goals</h1>
        </div>
        <div className='ms-auto flex items-center space-x-4'>
          <Button onClick={handleAddGoal}>
            <Plus className='mr-1 h-4 w-4' />
            Add Goal
          </Button>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value='ACTIVE'>Active</TabsTrigger>
            <TabsTrigger value='COMPLETED'>Completed</TabsTrigger>
            <TabsTrigger value='ARCHIVED'>Archived</TabsTrigger>
          </TabsList>

          <TabsContent value={statusFilter} className='mt-4'>
            {isLoading ? (
              <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : goals.length === 0 ? (
              <Card className='flex flex-col items-center justify-center py-12'>
                <Target className='text-muted-foreground mb-4 h-12 w-12' />
                <h3 className='mb-2 text-lg font-medium'>
                  No {statusFilter.toLowerCase()} goals
                </h3>
                <p className='text-muted-foreground mb-4'>
                  {statusFilter === 'ACTIVE'
                    ? 'Create a goal to start tracking your progress'
                    : `You don't have any ${statusFilter.toLowerCase()} goals yet`}
                </p>
                {statusFilter === 'ACTIVE' && (
                  <Button onClick={handleAddGoal}>
                    <Plus className='mr-1 h-4 w-4' />
                    Add Goal
                  </Button>
                )}
              </Card>
            ) : (
              <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                {goals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    typeColors={typeColors}
                    onEdit={() => handleEditGoal(goal)}
                    onDelete={() => deleteMutation.mutate(goal.id)}
                    onComplete={() => handleMarkComplete(goal)}
                    onArchive={() => handleArchive(goal)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Main>

      {/* Goal Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>
              {editingGoal ? 'Edit Goal' : 'New Goal'}
            </DialogTitle>
          </DialogHeader>
          <GoalForm
            goal={editingGoal}
            onSaved={handleGoalSaved}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

interface GoalCardProps {
  goal: Goal
  typeColors: Record<string, string>
  onEdit: () => void
  onDelete: () => void
  onComplete: () => void
  onArchive: () => void
}

function GoalCard({
  goal,
  typeColors,
  onEdit,
  onDelete,
  onComplete,
  onArchive,
}: GoalCardProps) {
  return (
    <Card>
      <CardHeader className='pb-2'>
        <div className='flex items-start justify-between'>
          <div className='flex-1'>
            <CardTitle className='text-base flex items-center gap-2'>
              {goal.title}
              {goal.isRecurring && (
                <Repeat className='h-4 w-4 text-muted-foreground' />
              )}
            </CardTitle>
            <div className='mt-1 flex items-center gap-2'>
              <Badge className={typeColors[goal.type]}>{goal.type}</Badge>
              {goal.status === 'COMPLETED' && (
                <Badge variant='outline' className='text-green-600'>
                  Completed
                </Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='icon' className='h-8 w-8'>
                <MoreHorizontal className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onClick={onEdit}>
                <Edit className='mr-2 h-4 w-4' />
                Edit
              </DropdownMenuItem>
              {goal.status === 'ACTIVE' && (
                <>
                  <DropdownMenuItem onClick={onComplete}>
                    <CheckCircle2 className='mr-2 h-4 w-4' />
                    Mark Complete
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onArchive}>
                    <Archive className='mr-2 h-4 w-4' />
                    Archive
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className='text-destructive'>
                <Trash2 className='mr-2 h-4 w-4' />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {goal.description && (
          <p className='text-muted-foreground mb-3 line-clamp-2 text-sm'>
            {goal.description}
          </p>
        )}

        <div className='mb-2'>
          <div className='mb-1 flex items-center justify-between text-sm'>
            <span>Progress</span>
            <span className='font-medium'>{goal.progress || 0}%</span>
          </div>
          <Progress value={goal.progress || 0} className='h-2' />
        </div>

        <div className='text-muted-foreground flex items-center justify-between text-xs'>
          <span>
            {goal.completedTasks || 0} / {goal.totalTasks || 0} tasks
          </span>
          <span>
            {format(new Date(goal.startDate), 'MMM d')} -{' '}
            {format(new Date(goal.endDate), 'MMM d')}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export default Goals
