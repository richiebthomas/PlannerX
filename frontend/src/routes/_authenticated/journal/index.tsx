// path: src/routes/_authenticated/journal/index.tsx

import { createFileRoute } from '@tanstack/react-router'
import { Journal } from '@/features/notes'

export const Route = createFileRoute('/_authenticated/journal/')({
  component: Journal,
})
