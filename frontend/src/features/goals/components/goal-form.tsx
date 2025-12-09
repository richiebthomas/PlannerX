// path: src/features/goals/components/goal-form.tsx

import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { format, addWeeks, addYears, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { goalsApi, type Goal } from '@/lib/api'
import { toast } from 'sonner'
import { Repeat } from 'lucide-react'

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  type: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  startDate: z.string(),
  endDate: z.string(),
  color: z.string().optional(),
  isRecurring: z.boolean().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface GoalFormProps {
  goal?: Goal | null
  onSaved: () => void
  onCancel: () => void
}

export function GoalForm({ goal, onSaved, onCancel }: GoalFormProps) {
  const today = new Date()

  const getDefaultDates = (type: string) => {
    switch (type) {
      case 'DAILY':
        return {
          start: format(today, 'yyyy-MM-dd'),
          end: format(today, 'yyyy-MM-dd'),
        }
      case 'WEEKLY':
        return {
          start: format(startOfWeek(today), 'yyyy-MM-dd'),
          end: format(endOfWeek(today), 'yyyy-MM-dd'),
        }
      case 'MONTHLY':
        return {
          start: format(startOfMonth(today), 'yyyy-MM-dd'),
          end: format(endOfMonth(today), 'yyyy-MM-dd'),
        }
      case 'YEARLY':
        return {
          start: format(today, 'yyyy-MM-dd'),
          end: format(addYears(today, 1), 'yyyy-MM-dd'),
        }
      default:
        return {
          start: format(today, 'yyyy-MM-dd'),
          end: format(addWeeks(today, 1), 'yyyy-MM-dd'),
        }
    }
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: goal?.title || '',
      description: goal?.description || '',
      type: goal?.type || 'WEEKLY',
      startDate: goal ? format(new Date(goal.startDate), 'yyyy-MM-dd') : getDefaultDates('WEEKLY').start,
      endDate: goal ? format(new Date(goal.endDate), 'yyyy-MM-dd') : getDefaultDates('WEEKLY').end,
      color: goal?.color || '',
      isRecurring: goal?.isRecurring || false,
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<Goal>) => goalsApi.create(data),
    onSuccess: () => {
      toast.success('Goal created')
      onSaved()
    },
    onError: () => {
      toast.error('Failed to create goal')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Goal> }) =>
      goalsApi.update(id, data),
    onSuccess: () => {
      toast.success('Goal updated')
      onSaved()
    },
    onError: () => {
      toast.error('Failed to update goal')
    },
  })

  const onSubmit = (values: FormValues) => {
    const goalData = {
      title: values.title,
      description: values.description || undefined,
      type: values.type,
      startDate: new Date(values.startDate).toISOString(),
      endDate: new Date(values.endDate).toISOString(),
      color: values.color || undefined,
      isRecurring: values.isRecurring || false,
    }

    if (goal) {
      updateMutation.mutate({ id: goal.id, data: goalData })
    } else {
      createMutation.mutate(goalData)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  // Update dates when type changes
  const handleTypeChange = (type: string) => {
    const dates = getDefaultDates(type)
    form.setValue('startDate', dates.start)
    form.setValue('endDate', dates.end)
    form.setValue('type', type as any)
  }

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
                <Input placeholder='What do you want to achieve?' {...field} />
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
              <FormLabel>Description (optional)</FormLabel>
              <FormControl>
                <Textarea placeholder='Add more details about this goal' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='type'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Goal Type</FormLabel>
              <Select onValueChange={handleTypeChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value='DAILY'>Daily Goal</SelectItem>
                  <SelectItem value='WEEKLY'>Weekly Goal</SelectItem>
                  <SelectItem value='MONTHLY'>Monthly Goal</SelectItem>
                  <SelectItem value='YEARLY'>Yearly Goal</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='grid grid-cols-2 gap-4'>
          <FormField
            control={form.control}
            name='startDate'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input type='date' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='endDate'
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date</FormLabel>
                <FormControl>
                  <Input type='date' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name='isRecurring'
          render={({ field }) => (
            <FormItem className='flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4'>
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className='space-y-1 leading-none'>
                <FormLabel className='flex items-center gap-2'>
                  <Repeat className='h-4 w-4' />
                  Recurring Goal
                </FormLabel>
                <FormDescription>
                  Automatically create a new goal for the next {form.watch('type').toLowerCase()} period when completed. Incomplete tasks will be moved to the new goal.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className='flex justify-end gap-2'>
          <Button type='button' variant='outline' onClick={onCancel}>
            Cancel
          </Button>
          <Button type='submit' disabled={isLoading}>
            {isLoading ? 'Saving...' : goal ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
