// path: src/features/notes/index.tsx

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  isSameDay,
} from 'date-fns'
import {
  Plus,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Edit,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// Removed unused Badge import
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
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { notesApi, type Note } from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { NoteForm } from './components/note-form'

export function Journal() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const queryClient = useQueryClient()

  const { data: notes = [] } = useQuery({
    queryKey: ['notes', 'journal', currentMonth.toISOString()],
    queryFn: async () => {
      const { data } = await notesApi.getJournal(
        startOfMonth(currentMonth).toISOString(),
        endOfMonth(currentMonth).toISOString()
      )
      return data
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notesApi.delete(id),
    onSuccess: () => {
      toast.success('Entry deleted')
      queryClient.invalidateQueries({ queryKey: ['notes'] })
    },
  })

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((current) =>
      direction === 'prev' ? subMonths(current, 1) : addMonths(current, 1)
    )
  }

  const handleAddEntry = () => {
    setEditingNote(null)
    setIsFormOpen(true)
  }

  const handleEditEntry = (note: Note) => {
    setEditingNote(note)
    setIsFormOpen(true)
  }

  const handleNoteSaved = () => {
    setIsFormOpen(false)
    setEditingNote(null)
    queryClient.invalidateQueries({ queryKey: ['notes'] })
  }

  // Get note for selected date
  const selectedDateNote = notes.find((n) =>
    isSameDay(parseISO(n.date), selectedDate)
  )

  // Get dates that have entries (for future calendar highlighting feature)
  // const datesWithEntries = new Set(
  //   notes.map((n) => format(parseISO(n.date), 'yyyy-MM-dd'))
  // )

  return (
    <>
      <Header>
        <div className='flex items-center gap-4'>
          <h1 className='text-lg font-semibold'>Journal</h1>
          <div className='flex items-center gap-1'>
            <Button variant='outline' size='icon' onClick={() => navigateMonth('prev')}>
              <ChevronLeft className='h-4 w-4' />
            </Button>
            <span className='min-w-[120px] text-center text-sm'>
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button variant='outline' size='icon' onClick={() => navigateMonth('next')}>
              <ChevronRight className='h-4 w-4' />
            </Button>
          </div>
        </div>
        <div className='ms-auto flex items-center space-x-4'>
          <Button onClick={handleAddEntry}>
            <Plus className='mr-1 h-4 w-4' />
            New Entry
          </Button>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='grid gap-4 lg:grid-cols-[300px_1fr]'>
          {/* Sidebar with dates */}
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm'>Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className='h-[500px]'>
                <div className='space-y-1'>
                  {notes.length === 0 ? (
                    <p className='text-muted-foreground py-4 text-center text-sm'>
                      No journal entries this month
                    </p>
                  ) : (
                    notes.map((note) => {
                      const noteDate = parseISO(note.date)
                      const isSelected = isSameDay(noteDate, selectedDate)

                      return (
                        <button
                          key={note.id}
                          onClick={() => setSelectedDate(noteDate)}
                          className={cn(
                            'w-full rounded-lg p-2 text-left transition-colors',
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted'
                          )}
                        >
                          <div className='flex items-center justify-between'>
                            <span className='font-medium'>
                              {format(noteDate, 'EEEE, MMM d')}
                            </span>
                          </div>
                          {note.title && (
                            <p
                              className={cn(
                                'mt-1 line-clamp-1 text-sm',
                                isSelected
                                  ? 'text-primary-foreground/80'
                                  : 'text-muted-foreground'
                              )}
                            >
                              {note.title}
                            </p>
                          )}
                        </button>
                      )
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Main content area */}
          <Card>
            <CardHeader className='flex flex-row items-center justify-between'>
              <div>
                <CardTitle>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</CardTitle>
              </div>
              {selectedDateNote && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant='ghost' size='icon'>
                      <MoreHorizontal className='h-4 w-4' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <DropdownMenuItem onClick={() => handleEditEntry(selectedDateNote)}>
                      <Edit className='mr-2 h-4 w-4' />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => deleteMutation.mutate(selectedDateNote.id)}
                      className='text-destructive'
                    >
                      <Trash2 className='mr-2 h-4 w-4' />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </CardHeader>
            <CardContent>
              {selectedDateNote ? (
                <div className='prose dark:prose-invert max-w-none'>
                  {selectedDateNote.title && (
                    <h2 className='text-xl font-semibold'>{selectedDateNote.title}</h2>
                  )}
                  <div
                    className='text-sm'
                    dangerouslySetInnerHTML={{ __html: selectedDateNote.content }}
                  />
                </div>
              ) : (
                <div className='flex flex-col items-center justify-center py-12'>
                  <BookOpen className='text-muted-foreground mb-4 h-12 w-12' />
                  <h3 className='mb-2 text-lg font-medium'>No entry for this day</h3>
                  <p className='text-muted-foreground mb-4'>
                    Write about your day, thoughts, or reflections
                  </p>
                  <Button onClick={handleAddEntry}>
                    <Plus className='mr-1 h-4 w-4' />
                    Write Entry
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>

      {/* Note Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>
              {editingNote ? 'Edit Entry' : 'New Journal Entry'}
            </DialogTitle>
          </DialogHeader>
          <NoteForm
            note={editingNote}
            defaultDate={selectedDate}
            onSaved={handleNoteSaved}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

export default Journal
