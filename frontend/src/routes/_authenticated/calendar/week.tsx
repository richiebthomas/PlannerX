// path: src/routes/_authenticated/calendar/week.tsx

import { createFileRoute } from '@tanstack/react-router'
import { Calendar } from '@/features/calendar'

export const Route = createFileRoute('/_authenticated/calendar/week')({
  component: () => <Calendar view='week' />,
})
