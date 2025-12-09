// path: src/features/habits/components/habit-form.tsx

import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
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
import { habitsApi, type Habit } from '@/lib/api'
import { toast } from 'sonner'

const COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#10B981', // Emerald
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#A855F7', // Purple
  '#EC4899', // Pink
]

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  color: z.string(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  targetCount: z.string(),
})

type FormValues = z.infer<typeof formSchema>

interface HabitFormProps {
  habit?: Habit | null
  onSaved: () => void
  onCancel: () => void
}

export function HabitForm({ habit, onSaved, onCancel }: HabitFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: habit?.name || '',
      description: habit?.description || '',
      color: habit?.color || '#10B981',
      frequency: habit?.frequency || 'DAILY',
      targetCount: habit?.targetCount?.toString() || '1',
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<Habit>) => habitsApi.create(data),
    onSuccess: () => {
      toast.success('Habit created')
      onSaved()
    },
    onError: () => {
      toast.error('Failed to create habit')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Habit> }) =>
      habitsApi.update(id, data),
    onSuccess: () => {
      toast.success('Habit updated')
      onSaved()
    },
    onError: () => {
      toast.error('Failed to update habit')
    },
  })

  const onSubmit = (values: FormValues) => {
    const habitData = {
      name: values.name,
      description: values.description || undefined,
      color: values.color,
      frequency: values.frequency,
      targetCount: parseInt(values.targetCount),
    }

    if (habit) {
      updateMutation.mutate({ id: habit.id, data: habitData })
    } else {
      createMutation.mutate(habitData)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder='e.g., Exercise, Read, Meditate' {...field} />
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
                <Textarea placeholder='What is this habit about?' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='color'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <FormControl>
                <div className='flex flex-wrap gap-2'>
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type='button'
                      onClick={() => field.onChange(color)}
                      className={`h-8 w-8 rounded-full transition-transform ${
                        field.value === color
                          ? 'ring-2 ring-offset-2 ring-primary scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='grid grid-cols-2 gap-4'>
          <FormField
            control={form.control}
            name='frequency'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Frequency</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value='DAILY'>Daily</SelectItem>
                    <SelectItem value='WEEKLY'>Weekly</SelectItem>
                    <SelectItem value='MONTHLY'>Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='targetCount'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target per period</FormLabel>
                <FormControl>
                  <Input type='number' min='1' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className='flex justify-end gap-2'>
          <Button type='button' variant='outline' onClick={onCancel}>
            Cancel
          </Button>
          <Button type='submit' disabled={isLoading}>
            {isLoading ? 'Saving...' : habit ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
