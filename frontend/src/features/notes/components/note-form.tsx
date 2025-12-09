// path: src/features/notes/components/note-form.tsx

import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
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
import { notesApi, type Note } from '@/lib/api'
import { toast } from 'sonner'

const formSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1, 'Content is required'),
  date: z.string(),
})

type FormValues = z.infer<typeof formSchema>

interface NoteFormProps {
  note?: Note | null
  defaultDate?: Date
  onSaved: () => void
  onCancel: () => void
}

export function NoteForm({ note, defaultDate, onSaved, onCancel }: NoteFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: note?.title || '',
      content: note?.content || '',
      date: note
        ? format(new Date(note.date), 'yyyy-MM-dd')
        : format(defaultDate || new Date(), 'yyyy-MM-dd'),
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<Note>) => notesApi.create(data),
    onSuccess: () => {
      toast.success('Entry saved')
      onSaved()
    },
    onError: () => {
      toast.error('Failed to save entry')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Note> }) =>
      notesApi.update(id, data),
    onSuccess: () => {
      toast.success('Entry updated')
      onSaved()
    },
    onError: () => {
      toast.error('Failed to update entry')
    },
  })

  const onSubmit = (values: FormValues) => {
    const noteData = {
      title: values.title || undefined,
      content: values.content,
      date: values.date,
      isJournal: true,
    }

    if (note) {
      updateMutation.mutate({ id: note.id, data: noteData })
    } else {
      createMutation.mutate(noteData)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
        <FormField
          control={form.control}
          name='date'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type='date' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='title'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title (optional)</FormLabel>
              <FormControl>
                <Input placeholder='Give your entry a title' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='content'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='Write about your day, thoughts, or reflections...'
                  className='min-h-[200px]'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='flex justify-end gap-2'>
          <Button type='button' variant='outline' onClick={onCancel}>
            Cancel
          </Button>
          <Button type='submit' disabled={isLoading}>
            {isLoading ? 'Saving...' : note ? 'Update' : 'Save'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
