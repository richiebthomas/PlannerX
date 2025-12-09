// path: src/routes/_authenticated/calendar/month.tsx

import { createFileRoute } from '@tanstack/react-router'
import { Calendar } from '@/features/calendar'

export const Route = createFileRoute('/_authenticated/calendar/month')({
  component: () => <Calendar view='month' />,
})
