// path: src/features/tasks/components/task-form.tsx

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { tasksApi, categoriesApi, goalsApi, type Task } from '@/lib/api'
import { toast } from 'sonner'

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  estimatedTime: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
  categoryId: z.string().optional(),
  goalId: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface TaskFormProps {
  task?: Task | null
  parentTaskId?: string | null
  onSaved: () => void
  onCancel: () => void
}

export function TaskForm({ task, parentTaskId, onSaved, onCancel }: TaskFormProps) {
  const queryClient = useQueryClient()
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [showNewGoal, setShowNewGoal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState('#3b82f6')
  const [newGoalTitle, setNewGoalTitle] = useState('')
  const [newGoalType, setNewGoalType] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('WEEKLY')

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await categoriesApi.list()
      return data
    },
  })

  const { data: goals = [] } = useQuery({
    queryKey: ['goals', 'active'],
    queryFn: async () => {
      const { data } = await goalsApi.list({ status: 'ACTIVE' })
      return data
    },
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      dueDate: task?.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
      estimatedTime: task?.estimatedTime?.toString() || '',
      priority: task?.priority || 'MEDIUM',
      status: task?.status || 'TODO',
      categoryId: task?.categoryId || 'none',
      goalId: task?.goalId || 'none',
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<Task>) => tasksApi.create(data),
    onSuccess: () => {
      toast.success('Task created')
      onSaved()
    },
    onError: () => {
      toast.error('Failed to create task')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) =>
      tasksApi.update(id, data),
    onSuccess: () => {
      toast.success('Task updated')
      onSaved()
    },
    onError: () => {
      toast.error('Failed to update task')
    },
  })

  const createCategoryMutation = useMutation({
    mutationFn: (data: { name: string; color: string }) => categoriesApi.create(data),
    onSuccess: (response) => {
      toast.success('Category created')
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      form.setValue('categoryId', response.data.id)
      setShowNewCategory(false)
      setNewCategoryName('')
      setNewCategoryColor('#3b82f6')
    },
    onError: () => {
      toast.error('Failed to create category')
    },
  })

  const createGoalMutation = useMutation({
    mutationFn: (data: { title: string; type: string; startDate: string; endDate: string; status: string }) => 
      goalsApi.create(data),
    onSuccess: (response) => {
      toast.success('Goal created')
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      form.setValue('goalId', response.data.id)
      setShowNewGoal(false)
      setNewGoalTitle('')
    },
    onError: () => {
      toast.error('Failed to create goal')
    },
  })

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) {
      toast.error('Category name is required')
      return
    }
    createCategoryMutation.mutate({ 
      name: newCategoryName.trim(), 
      color: newCategoryColor 
    })
  }

  const handleCreateGoal = () => {
    if (!newGoalTitle.trim()) {
      toast.error('Goal title is required')
      return
    }
    const today = new Date()
    const getGoalDates = () => {
      switch (newGoalType) {
        case 'DAILY':
          return { start: format(today, 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') }
        case 'WEEKLY':
          return { 
            start: format(today, 'yyyy-MM-dd'), 
            end: format(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd') 
          }
        case 'MONTHLY':
          return { 
            start: format(today, 'yyyy-MM-dd'), 
            end: format(new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()), 'yyyy-MM-dd') 
          }
        case 'YEARLY':
          return { 
            start: format(today, 'yyyy-MM-dd'), 
            end: format(new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()), 'yyyy-MM-dd') 
          }
      }
    }
    const dates = getGoalDates()
    createGoalMutation.mutate({ 
      title: newGoalTitle.trim(), 
      type: newGoalType,
      startDate: new Date(dates.start).toISOString(),
      endDate: new Date(dates.end).toISOString(),
      status: 'ACTIVE'
    })
  }

  const onSubmit = (values: FormValues) => {
    const taskData = {
      title: values.title,
      description: values.description || undefined,
      dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : undefined,
      estimatedTime: values.estimatedTime ? parseInt(values.estimatedTime) : undefined,
      priority: values.priority,
      status: values.status,
      categoryId: values.categoryId === 'none' ? undefined : values.categoryId || undefined,
      goalId: values.goalId === 'none' ? undefined : values.goalId || undefined,
      parentTaskId: parentTaskId || undefined,
    }

    if (task) {
      updateMutation.mutate({ id: task.id, data: taskData })
    } else {
      createMutation.mutate(taskData)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
        <FormField
          control={form.control}
          name='title'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder='Task title' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='description'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder='Task description (optional)' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='grid grid-cols-2 gap-4'>
          <FormField
            control={form.control}
            name='dueDate'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <FormControl>
                  <Input type='date' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='estimatedTime'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estimated Time (minutes)</FormLabel>
                <FormControl>
                  <Input type='number' min='1' placeholder='30' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className='grid grid-cols-2 gap-4'>
          <FormField
            control={form.control}
            name='priority'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value='LOW'>Low</SelectItem>
                    <SelectItem value='MEDIUM'>Medium</SelectItem>
                    <SelectItem value='HIGH'>High</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='status'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value='TODO'>To Do</SelectItem>
                    <SelectItem value='IN_PROGRESS'>In Progress</SelectItem>
                    <SelectItem value='DONE'>Done</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name='categoryId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select 
                onValueChange={(value) => {
                  if (value === 'create-new') {
                    setShowNewCategory(true)
                  } else {
                    field.onChange(value)
                  }
                }} 
                value={showNewCategory ? 'create-new' : field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='Select a category' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value='none'>No category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className='flex items-center gap-2'>
                        <div
                          className='h-3 w-3 rounded-full'
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value='create-new'>
                    <div className='flex items-center gap-2 text-primary'>
                      <Plus className='h-3 w-3' />
                      Create new category
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {showNewCategory && (
                <div className='mt-2 space-y-2 rounded-lg border p-3'>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm font-medium'>New Category</span>
                    <Button
                      type='button'
                      size='sm'
                      variant='ghost'
                      onClick={() => {
                        setShowNewCategory(false)
                        setNewCategoryName('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                  <Input
                    placeholder='Category name'
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleCreateCategory()
                      }
                    }}
                  />
                  <div className='flex items-center gap-2'>
                    <Input
                      type='color'
                      value={newCategoryColor}
                      onChange={(e) => setNewCategoryColor(e.target.value)}
                      className='h-10 w-20'
                    />
                    <Button
                      type='button'
                      size='sm'
                      onClick={handleCreateCategory}
                      disabled={createCategoryMutation.isPending}
                      className='flex-1'
                    >
                      {createCategoryMutation.isPending ? 'Creating...' : 'Create'}
                    </Button>
                  </div>
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='goalId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Goal</FormLabel>
              <Select 
                onValueChange={(value) => {
                  if (value === 'create-new') {
                    setShowNewGoal(true)
                  } else {
                    field.onChange(value)
                  }
                }} 
                value={showNewGoal ? 'create-new' : field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='Link to a goal (optional)' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value='none'>No goal</SelectItem>
                  {goals.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      {goal.title}
                    </SelectItem>
                  ))}
                  <SelectItem value='create-new'>
                    <div className='flex items-center gap-2 text-primary'>
                      <Plus className='h-3 w-3' />
                      Create new goal
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {showNewGoal && (
                <div className='mt-2 space-y-2 rounded-lg border p-3'>
                  <div className='flex items-center justify-between'>
                    <span className='text-sm font-medium'>New Goal</span>
                    <Button
                      type='button'
                      size='sm'
                      variant='ghost'
                      onClick={() => {
                        setShowNewGoal(false)
                        setNewGoalTitle('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                  <Input
                    placeholder='Goal title'
                    value={newGoalTitle}
                    onChange={(e) => setNewGoalTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleCreateGoal()
                      }
                    }}
                  />
                  <Select value={newGoalType} onValueChange={(v) => setNewGoalType(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='DAILY'>Daily</SelectItem>
                      <SelectItem value='WEEKLY'>Weekly</SelectItem>
                      <SelectItem value='MONTHLY'>Monthly</SelectItem>
                      <SelectItem value='YEARLY'>Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type='button'
                    size='sm'
                    onClick={handleCreateGoal}
                    disabled={createGoalMutation.isPending}
                    className='w-full'
                  >
                    {createGoalMutation.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='flex justify-end gap-2'>
          <Button type='button' variant='outline' onClick={onCancel}>
            Cancel
          </Button>
          <Button type='submit' disabled={isLoading}>
            {isLoading ? 'Saving...' : task ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
