// path: src/hooks/use-keyboard-shortcuts.tsx

import { useEffect, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'

interface ShortcutConfig {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  action: () => void
  description: string
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey
        const altMatch = shortcut.alt ? event.altKey : !event.altKey

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          event.preventDefault()
          shortcut.action()
          return
        }
      }
    },
    [shortcuts]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// Global shortcuts provider
export function useGlobalShortcuts() {
  const navigate = useNavigate()

  const shortcuts: ShortcutConfig[] = [
    {
      key: 't',
      description: 'Go to Today / Dashboard',
      action: () => navigate({ to: '/' }),
    },
    {
      key: 'c',
      description: 'Go to Calendar (Week View)',
      action: () => navigate({ to: '/calendar/week' }),
    },
    {
      key: 'l',
      description: 'Go to Tasks List',
      action: () => navigate({ to: '/tasks' }),
    },
    {
      key: 'h',
      description: 'Go to Habits',
      action: () => navigate({ to: '/habits' }),
    },
    {
      key: 'g',
      description: 'Go to Goals',
      action: () => navigate({ to: '/goals' }),
    },
    {
      key: 'j',
      description: 'Go to Journal',
      action: () => navigate({ to: '/journal' }),
    },
    {
      key: '/',
      description: 'Open Command Menu',
      action: () => {
        // Dispatch custom event to open command menu
        window.dispatchEvent(new CustomEvent('open-command-menu'))
      },
    },
  ]

  useKeyboardShortcuts(shortcuts)

  return shortcuts
}

export const SHORTCUT_DESCRIPTIONS = [
  { keys: ['T'], description: 'Go to Today / Dashboard' },
  { keys: ['C'], description: 'Go to Calendar' },
  { keys: ['L'], description: 'Go to Tasks' },
  { keys: ['H'], description: 'Go to Habits' },
  { keys: ['G'], description: 'Go to Goals' },
  { keys: ['J'], description: 'Go to Journal' },
  { keys: ['/'], description: 'Open Command Menu' },
  { keys: ['?'], description: 'Show Keyboard Shortcuts' },
]

