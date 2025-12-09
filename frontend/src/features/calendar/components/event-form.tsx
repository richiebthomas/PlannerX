// path: src/features/calendar/components/event-form.tsx

// Removed unused useEffect import
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, addHours, setHours, setMinutes } from 'date-fns'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
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
import { eventsApi, categoriesApi, type Event } from '@/lib/api'
import { toast } from 'sonner'
import { Bell, X, Repeat, Plus } from 'lucide-react'

const REMINDER_OPTIONS = [
  { value: '0', label: 'At time of event' },
  { value: '5', label: '5 minutes before' },
  { value: '10', label: '10 minutes before' },
  { value: '15', label: '15 minutes before' },
  { value: '30', label: '30 minutes before' },
  { value: '60', label: '1 hour before' },
  { value: '120', label: '2 hours before' },
  { value: '1440', label: '1 day before' },
  { value: '10080', label: '1 week before' },
]

const RECURRENCE_OPTIONS = [
  { value: '', label: 'Does not repeat' },
  { value: 'FREQ=DAILY', label: 'Daily' },
  { value: 'FREQ=WEEKLY', label: 'Weekly' },
  { value: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', label: 'Weekdays (Mon-Fri)' },
  { value: 'FREQ=WEEKLY;BYDAY=SA,SU', label: 'Weekends' },
  { value: 'FREQ=MONTHLY', label: 'Monthly' },
  { value: 'FREQ=YEARLY', label: 'Yearly' },
]

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string(),
  startTime: z.string(),
  endDate: z.string(),
  endTime: z.string(),
  allDay: z.boolean(),
  isFocusBlock: z.boolean(),
  categoryId: z.string().optional(),
  color: z.string().optional(),
  isRecurring: z.boolean(),
  recurrenceRule: z.string().optional(),
  recurrenceEnd: z.string().optional(),
  reminders: z.array(z.number()).optional(),
})

type FormValues = z.infer<typeof formSchema>

interface EventFormProps {
  event?: Event | null
  defaultDate?: Date | null
  onSaved: () => void
  onCancel: () => void
}

export function EventForm({ event, defaultDate, onSaved, onCancel }: EventFormProps) {
  const queryClient = useQueryClient()
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState('#3b82f6')

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await categoriesApi.list()
      return data
    },
  })

  const defaultStart = defaultDate || new Date()
  const defaultEnd = addHours(defaultStart, 1)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: event?.title || '',
      description: event?.description || '',
      location: event?.location || '',
      startDate: event ? format(new Date(event.startTime), 'yyyy-MM-dd') : format(defaultStart, 'yyyy-MM-dd'),
      startTime: event ? format(new Date(event.startTime), 'HH:mm') : format(defaultStart, 'HH:mm'),
      endDate: event ? format(new Date(event.endTime), 'yyyy-MM-dd') : format(defaultEnd, 'yyyy-MM-dd'),
      endTime: event ? format(new Date(event.endTime), 'HH:mm') : format(defaultEnd, 'HH:mm'),
      allDay: event?.allDay || false,
      isFocusBlock: event?.isFocusBlock || false,
      categoryId: event?.categoryId || 'none',
      color: event?.color || '',
      isRecurring: event?.isRecurring || false,
      recurrenceRule: event?.recurrenceRule || '',
      recurrenceEnd: event?.recurrenceEnd ? format(new Date(event.recurrenceEnd), 'yyyy-MM-dd') : '',
      reminders: event?.reminders?.map(r => r.offset) || [10],
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<Event>) => eventsApi.create(data),
    onSuccess: () => {
      toast.success('Event created')
      onSaved()
    },
    onError: () => {
      toast.error('Failed to create event')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Event> }) =>
      eventsApi.update(id, data),
    onSuccess: () => {
      toast.success('Event updated')
      onSaved()
    },
    onError: () => {
      toast.error('Failed to update event')
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

  const onSubmit = (values: FormValues) => {
    const [startHour, startMin] = values.startTime.split(':').map(Number)
    const [endHour, endMin] = values.endTime.split(':').map(Number)

    const startTime = setMinutes(
      setHours(new Date(values.startDate), startHour),
      startMin
    ).toISOString()

    const endTime = setMinutes(
      setHours(new Date(values.endDate), endHour),
      endMin
    ).toISOString()

    const eventData = {
      title: values.title,
      description: values.description || undefined,
      location: values.location || undefined,
      startTime,
      endTime,
      allDay: values.allDay,
      isFocusBlock: values.isFocusBlock,
      categoryId: values.categoryId === 'none' ? undefined : values.categoryId || undefined,
      color: values.color || undefined,
      isRecurring: values.isRecurring,
      recurrenceRule: values.isRecurring ? values.recurrenceRule : undefined,
      recurrenceEnd: values.isRecurring && values.recurrenceEnd 
        ? new Date(values.recurrenceEnd).toISOString() 
        : undefined,
    }

    if (event) {
      updateMutation.mutate({ id: event.id, data: eventData })
    } else {
      createMutation.mutate(eventData)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending
  const allDay = form.watch('allDay')
  const isRecurring = form.watch('isRecurring')
  const reminders = form.watch('reminders') || []

  const addReminder = (offset: number) => {
    const current = form.getValues('reminders') || []
    if (!current.includes(offset)) {
      form.setValue('reminders', [...current, offset])
    }
  }

  const removeReminder = (offset: number) => {
    const current = form.getValues('reminders') || []
    form.setValue('reminders', current.filter(r => r !== offset))
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4 max-h-[70vh] overflow-y-auto px-1'>
        <FormField
          control={form.control}
          name='title'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder='Event title' {...field} />
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
                <Textarea placeholder='Event description' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='location'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input placeholder='Location (optional)' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='flex items-center gap-4'>
          <FormField
            control={form.control}
            name='allDay'
            render={({ field }) => (
              <FormItem className='flex items-center gap-2'>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className='!mt-0'>All day</FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='isFocusBlock'
            render={({ field }) => (
              <FormItem className='flex items-center gap-2'>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className='!mt-0'>Focus block</FormLabel>
              </FormItem>
            )}
          />
        </div>

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

          {!allDay && (
            <FormField
              control={form.control}
              name='startTime'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Time</FormLabel>
                  <FormControl>
                    <Input type='time' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

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

          {!allDay && (
            <FormField
              control={form.control}
              name='endTime'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Time</FormLabel>
                  <FormControl>
                    <Input type='time' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
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

        {/* Recurring Events Section */}
        <div className='space-y-3 rounded-lg border p-4'>
          <FormField
            control={form.control}
            name='isRecurring'
            render={({ field }) => (
              <FormItem className='flex items-center gap-2'>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className='!mt-0 flex items-center gap-2'>
                  <Repeat className='h-4 w-4' />
                  Recurring Event
                </FormLabel>
              </FormItem>
            )}
          />

          {isRecurring && (
            <>
              <FormField
                control={form.control}
                name='recurrenceRule'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repeat</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select frequency' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RECURRENCE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value || 'none'} value={opt.value || 'none'}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='recurrenceEnd'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Repeat</FormLabel>
                    <FormControl>
                      <Input type='date' placeholder='Never' {...field} />
                    </FormControl>
                    <FormDescription>Leave empty for no end date</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
        </div>

        {/* Reminders Section */}
        <div className='space-y-3 rounded-lg border p-4'>
          <div className='flex items-center gap-2'>
            <Bell className='h-4 w-4' />
            <span className='font-medium'>Reminders</span>
          </div>
          
          <div className='flex flex-wrap gap-2'>
            {reminders.map((offset) => {
              const option = REMINDER_OPTIONS.find(o => o.value === String(offset))
              return (
                <Badge key={offset} variant='secondary' className='gap-1'>
                  {option?.label || `${offset} min`}
                  <button
                    type='button'
                    onClick={() => removeReminder(offset)}
                    className='ml-1 hover:text-destructive'
                  >
                    <X className='h-3 w-3' />
                  </button>
                </Badge>
              )
            })}
          </div>

          <Select onValueChange={(val) => addReminder(parseInt(val))}>
            <SelectTrigger className='w-full'>
              <SelectValue placeholder='Add a reminder' />
            </SelectTrigger>
            <SelectContent>
              {REMINDER_OPTIONS.filter(
                opt => !reminders.includes(parseInt(opt.value))
              ).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex justify-end gap-2 pt-4'>
          <Button type='button' variant='outline' onClick={onCancel}>
            Cancel
          </Button>
          <Button type='submit' disabled={isLoading}>
            {isLoading ? 'Saving...' : event ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
