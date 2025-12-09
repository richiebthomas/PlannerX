// path: src/routes/_authenticated/calendar/day.tsx

import { createFileRoute } from '@tanstack/react-router'
import { Calendar } from '@/features/calendar'

export const Route = createFileRoute('/_authenticated/calendar/day')({
  component: () => <Calendar view='day' />,
})
