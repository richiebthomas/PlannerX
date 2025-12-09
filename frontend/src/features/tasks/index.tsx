// path: src/features/tasks/index.tsx

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Plus,
  Search,
  CheckCircle2,
  Circle,
  Clock,
  MoreHorizontal,
  Trash2,
  Edit,
  ChevronDown,
  PlayCircle,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { tasksApi, type Task } from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { TaskForm } from './components/task-form'
import { TaskListSkeleton } from '@/components/skeletons/list-skeleton'

export function Tasks() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [priorityFilter, setPriorityFilter] = useState<string>('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [parentTaskId, setParentTaskId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: allTasks = [], isLoading } = useQuery({
    queryKey: ['tasks', { status: statusFilter, priority: priorityFilter, search }],
    queryFn: async () => {
      const { data } = await tasksApi.list({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        search: search || undefined,
      })
      return data
    },
  })

  // Filter out future recurring tasks
  // Recurring tasks should only show when their goal period has started
  // But manually created tasks with future due dates should always show
  const tasks = allTasks.filter((task) => {
    if (!task.isRecurring) {
      // Non-recurring tasks always show, regardless of due date
      return true
    }
    
    // For recurring tasks, check if their goal has started
    if (task.goal && task.goal.startDate) {
      const goalStartDate = new Date(task.goal.startDate)
      const now = new Date()
      return goalStartDate <= now
    }
    
    // If no goal info, show the task (shouldn't happen for recurring tasks)
    return true
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) =>
      tasksApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => {
      toast.success('Task deleted')
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const handleToggleStatus = (task: Task) => {
    const newStatus = task.status === 'DONE' ? 'TODO' : 'DONE'
    updateMutation.mutate({ id: task.id, data: { status: newStatus } })
  }

  const handleChangeStatus = (task: Task, newStatus: 'TODO' | 'IN_PROGRESS' | 'DONE') => {
    updateMutation.mutate({ id: task.id, data: { status: newStatus } })
  }

  const handleAddTask = (parentId?: string) => {
    setEditingTask(null)
    setParentTaskId(parentId || null)
    setIsFormOpen(true)
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setParentTaskId(null)
    setIsFormOpen(true)
  }

  const handleTaskSaved = () => {
    setIsFormOpen(false)
    setEditingTask(null)
    setParentTaskId(null)
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
  }

  const todoTasks = tasks.filter((t) => t.status === 'TODO')
  const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS')
  const doneTasks = tasks.filter((t) => t.status === 'DONE')

  return (
    <>
      <Header>
        <div className='flex items-center gap-2'>
          <h1 className='text-lg font-semibold'>Tasks</h1>
        </div>
        <div className='ms-auto flex items-center space-x-4'>
          <Button onClick={() => handleAddTask()}>
            <Plus className='mr-1 h-4 w-4' />
            Add Task
          </Button>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        {/* Filters */}
        <div className='mb-4 flex flex-wrap gap-4'>
          <div className='relative flex-1 min-w-[200px]'>
            <Search className='text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2' />
            <Input
              placeholder='Search tasks...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='pl-10'
            />
          </div>
          <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className='w-[150px]'>
              <SelectValue placeholder='All Status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Status</SelectItem>
              <SelectItem value='TODO'>To Do</SelectItem>
              <SelectItem value='IN_PROGRESS'>In Progress</SelectItem>
              <SelectItem value='DONE'>Done</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter || 'all'} onValueChange={(v) => setPriorityFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className='w-[150px]'>
              <SelectValue placeholder='All Priority' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Priority</SelectItem>
              <SelectItem value='HIGH'>High</SelectItem>
              <SelectItem value='MEDIUM'>Medium</SelectItem>
              <SelectItem value='LOW'>Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Task Lists */}
        <div className='grid gap-4 lg:grid-cols-3'>
          {/* To Do */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <Circle className='h-4 w-4 text-gray-400' />
                To Do
                <Badge variant='secondary' className='ml-auto'>
                  {todoTasks.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className='h-[500px] pr-2'>
                {isLoading ? (
                  <TaskListSkeleton count={4} />
                ) : (
                  <div className='space-y-2'>
                    {todoTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onToggle={() => handleToggleStatus(task)}
                        onChangeStatus={(status) => handleChangeStatus(task, status)}
                        onEdit={() => handleEditTask(task)}
                        onDelete={() => deleteMutation.mutate(task.id)}
                        onAddSubtask={() => handleAddTask(task.id)}
                      />
                    ))}
                    {todoTasks.length === 0 && (
                      <p className='text-muted-foreground py-8 text-center text-sm'>
                        No tasks to do
                      </p>
                    )}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* In Progress */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <Clock className='h-4 w-4 text-blue-500' />
                In Progress
                <Badge variant='secondary' className='ml-auto'>
                  {inProgressTasks.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className='h-[500px] pr-2'>
                {isLoading ? (
                  <TaskListSkeleton count={4} />
                ) : (
                  <div className='space-y-2'>
                    {inProgressTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onToggle={() => handleToggleStatus(task)}
                        onChangeStatus={(status) => handleChangeStatus(task, status)}
                        onEdit={() => handleEditTask(task)}
                        onDelete={() => deleteMutation.mutate(task.id)}
                        onAddSubtask={() => handleAddTask(task.id)}
                      />
                    ))}
                    {inProgressTasks.length === 0 && (
                      <p className='text-muted-foreground py-8 text-center text-sm'>
                        No tasks in progress
                      </p>
                    )}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Done */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='flex items-center gap-2 text-base'>
                <CheckCircle2 className='h-4 w-4 text-green-500' />
                Done
                <Badge variant='secondary' className='ml-auto'>
                  {doneTasks.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className='h-[500px] pr-2'>
                {isLoading ? (
                  <TaskListSkeleton count={4} />
                ) : (
                  <div className='space-y-2'>
                    {doneTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onToggle={() => handleToggleStatus(task)}
                        onChangeStatus={(status) => handleChangeStatus(task, status)}
                        onEdit={() => handleEditTask(task)}
                        onDelete={() => deleteMutation.mutate(task.id)}
                        onAddSubtask={() => handleAddTask(task.id)}
                      />
                    ))}
                    {doneTasks.length === 0 && (
                      <p className='text-muted-foreground py-8 text-center text-sm'>
                        No completed tasks
                      </p>
                    )}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </Main>

      {/* Task Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>
              {editingTask ? 'Edit Task' : parentTaskId ? 'Add Subtask' : 'New Task'}
            </DialogTitle>
          </DialogHeader>
          <TaskForm
            task={editingTask}
            parentTaskId={parentTaskId}
            onSaved={handleTaskSaved}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

interface TaskCardProps {
  task: Task
  onToggle: () => void
  onChangeStatus: (status: 'TODO' | 'IN_PROGRESS' | 'DONE') => void
  onEdit: () => void
  onDelete: () => void
  onAddSubtask: () => void
}

function TaskCard({ task, onToggle, onChangeStatus, onEdit, onDelete, onAddSubtask }: TaskCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const hasSubtasks = task.subtasks && task.subtasks.length > 0

  const priorityColors = {
    LOW: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-400',
    HIGH: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-400',
  }

  return (
    <div className='rounded-lg border bg-card p-3'>
      <div className='flex items-start gap-3'>
        <div className='mt-0.5'>
          {task.status === 'IN_PROGRESS' ? (
            <div className='flex h-4 w-4 items-center justify-center rounded border-2 border-blue-500 bg-blue-100 dark:bg-blue-900'>
              <PlayCircle className='h-3 w-3 text-blue-600 dark:text-blue-400' />
            </div>
          ) : (
            <Checkbox
              checked={task.status === 'DONE'}
              onCheckedChange={onToggle}
            />
          )}
        </div>
        <div className='flex-1 min-w-0'>
          <div className='flex items-start justify-between gap-2'>
            <p
              className={cn(
                'font-medium',
                task.status === 'DONE' && 'line-through opacity-50',
                task.status === 'IN_PROGRESS' && 'text-blue-600 dark:text-blue-400'
              )}
            >
              {task.title}
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' size='icon' className='h-6 w-6'>
                  <MoreHorizontal className='h-4 w-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                {task.status !== 'TODO' && (
                  <DropdownMenuItem onClick={() => onChangeStatus('TODO')}>
                    <RotateCcw className='mr-2 h-4 w-4' />
                    Move to To Do
                  </DropdownMenuItem>
                )}
                {task.status !== 'IN_PROGRESS' && (
                  <DropdownMenuItem onClick={() => onChangeStatus('IN_PROGRESS')}>
                    <PlayCircle className='mr-2 h-4 w-4' />
                    Move to In Progress
                  </DropdownMenuItem>
                )}
                {task.status !== 'DONE' && (
                  <DropdownMenuItem onClick={() => onChangeStatus('DONE')}>
                    <CheckCircle2 className='mr-2 h-4 w-4' />
                    Mark as Done
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className='mr-2 h-4 w-4' />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onAddSubtask}>
                  <Plus className='mr-2 h-4 w-4' />
                  Add Subtask
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className='text-destructive'>
                  <Trash2 className='mr-2 h-4 w-4' />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {task.description && (
            <p className='text-muted-foreground mt-1 line-clamp-2 text-sm'>
              {task.description}
            </p>
          )}

          <div className='mt-2 flex flex-wrap items-center gap-2'>
            <Badge variant='outline' className={priorityColors[task.priority]}>
              {task.priority}
            </Badge>
            {task.dueDate && (
              <span className='text-muted-foreground flex items-center gap-1 text-xs'>
                <Clock className='h-3 w-3' />
                {format(new Date(task.dueDate), 'MMM d')}
              </span>
            )}
            {task.estimatedTime && (
              <span className='text-muted-foreground text-xs'>
                {task.estimatedTime}m
              </span>
            )}
            {task.category && (
              <Badge
                variant='outline'
                style={{
                  borderColor: task.category.color,
                  color: task.category.color,
                }}
              >
                {task.category.name}
              </Badge>
            )}
          </div>

          {/* Subtasks */}
          {hasSubtasks && (
            <Collapsible open={isOpen} onOpenChange={setIsOpen} className='mt-2'>
              <CollapsibleTrigger asChild>
                <Button variant='ghost' size='sm' className='h-6 px-2'>
                  <ChevronDown
                    className={cn(
                      'mr-1 h-3 w-3 transition-transform',
                      isOpen && 'rotate-180'
                    )}
                  />
                  {task.subtasks!.length} subtask{task.subtasks!.length !== 1 && 's'}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className='mt-2 space-y-1'>
                {task.subtasks!.map((subtask) => (
                  <div
                    key={subtask.id}
                    className='text-muted-foreground flex items-center gap-2 pl-2 text-sm'
                  >
                    <Checkbox
                      checked={subtask.status === 'DONE'}
                      className='h-3 w-3'
                    />
                    <span
                      className={cn(
                        subtask.status === 'DONE' && 'line-through'
                      )}
                    >
                      {subtask.title}
                    </span>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>
    </div>
  )
}

export default Tasks
