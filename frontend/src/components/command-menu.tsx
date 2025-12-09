import React, { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, ChevronRight, Laptop, Moon, Sun, Keyboard, Plus } from 'lucide-react'
import { useSearch } from '@/context/search-provider'
import { useTheme } from '@/context/theme-provider'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { sidebarData } from './layout/data/sidebar-data'
import { ScrollArea } from './ui/scroll-area'
import { SHORTCUT_DESCRIPTIONS } from '@/hooks/use-keyboard-shortcuts'

export function CommandMenu() {
  const navigate = useNavigate()
  const { setTheme } = useTheme()
  const { open, setOpen } = useSearch()
  const [showShortcuts, setShowShortcuts] = useState(false)

  // Listen for custom event to open command menu
  useEffect(() => {
    const handleOpenMenu = () => setOpen(true)
    window.addEventListener('open-command-menu', handleOpenMenu)
    return () => window.removeEventListener('open-command-menu', handleOpenMenu)
  }, [setOpen])

  // Listen for ? key to show shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      if (e.key === '?') {
        e.preventDefault()
        setShowShortcuts(true)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const runCommand = React.useCallback(
    (command: () => unknown) => {
      setOpen(false)
      command()
    },
    [setOpen]
  )

  return (
    <>
      <CommandDialog modal open={open} onOpenChange={setOpen}>
        <CommandInput placeholder='Type a command or search...' />
        <CommandList>
          <ScrollArea type='hover' className='h-80 pe-1'>
            <CommandEmpty>No results found.</CommandEmpty>
            
            {/* Quick Actions */}
            <CommandGroup heading='Quick Actions'>
              <CommandItem
                onSelect={() => runCommand(() => navigate({ to: '/calendar/day' }))}
              >
                <Plus className='text-muted-foreground' />
                <span>New Event</span>
                <span className='ml-auto text-xs text-muted-foreground'>Calendar</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => navigate({ to: '/tasks' }))}
              >
                <Plus className='text-muted-foreground' />
                <span>New Task</span>
                <span className='ml-auto text-xs text-muted-foreground'>Tasks</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => navigate({ to: '/habits' }))}
              >
                <Plus className='text-muted-foreground' />
                <span>New Habit</span>
                <span className='ml-auto text-xs text-muted-foreground'>Habits</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => navigate({ to: '/goals' }))}
              >
                <Plus className='text-muted-foreground' />
                <span>New Goal</span>
                <span className='ml-auto text-xs text-muted-foreground'>Goals</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => navigate({ to: '/journal' }))}
              >
                <Plus className='text-muted-foreground' />
                <span>New Journal Entry</span>
                <span className='ml-auto text-xs text-muted-foreground'>Journal</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            {sidebarData.navGroups.map((group) => (
              <CommandGroup key={group.title} heading={group.title}>
                {group.items.map((navItem, i) => {
                  if (navItem.url)
                    return (
                      <CommandItem
                        key={`${navItem.url}-${i}`}
                        value={navItem.title}
                        onSelect={() => {
                          runCommand(() => navigate({ to: navItem.url }))
                        }}
                      >
                        <div className='flex size-4 items-center justify-center'>
                          <ArrowRight className='text-muted-foreground/80 size-2' />
                        </div>
                        {navItem.title}
                      </CommandItem>
                    )

                  return navItem.items?.map((subItem, i) => (
                    <CommandItem
                      key={`${navItem.title}-${subItem.url}-${i}`}
                      value={`${navItem.title}-${subItem.url}`}
                      onSelect={() => {
                        runCommand(() => navigate({ to: subItem.url }))
                      }}
                    >
                      <div className='flex size-4 items-center justify-center'>
                        <ArrowRight className='text-muted-foreground/80 size-2' />
                      </div>
                      {navItem.title} <ChevronRight /> {subItem.title}
                    </CommandItem>
                  ))
                })}
              </CommandGroup>
            ))}
            <CommandSeparator />
            <CommandGroup heading='Theme'>
              <CommandItem onSelect={() => runCommand(() => setTheme('light'))}>
                <Sun /> <span>Light</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => setTheme('dark'))}>
                <Moon className='scale-90' />
                <span>Dark</span>
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => setTheme('system'))}>
                <Laptop />
                <span>System</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading='Help'>
              <CommandItem onSelect={() => { setOpen(false); setShowShortcuts(true) }}>
                <Keyboard />
                <span>Keyboard Shortcuts</span>
                <span className='ml-auto text-xs text-muted-foreground'>?</span>
              </CommandItem>
            </CommandGroup>
          </ScrollArea>
        </CommandList>
      </CommandDialog>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <Keyboard className='h-5 w-5' />
              Keyboard Shortcuts
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <h4 className='font-medium text-sm text-muted-foreground'>Navigation</h4>
              <div className='space-y-1'>
                {SHORTCUT_DESCRIPTIONS.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className='flex items-center justify-between py-1'
                  >
                    <span className='text-sm'>{shortcut.description}</span>
                    <div className='flex gap-1'>
                      {shortcut.keys.map((key) => (
                        <kbd
                          key={key}
                          className='px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted border rounded'
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className='space-y-2'>
              <h4 className='font-medium text-sm text-muted-foreground'>Tips</h4>
              <ul className='text-sm text-muted-foreground space-y-1'>
                <li>• Press <kbd className='px-1.5 py-0.5 text-xs bg-muted border rounded'>Esc</kbd> to close dialogs</li>
                <li>• Use the command menu to quickly navigate</li>
                <li>• Shortcuts are disabled when typing in inputs</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
