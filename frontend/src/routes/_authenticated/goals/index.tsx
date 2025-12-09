// path: src/routes/_authenticated/goals/index.tsx

import { createFileRoute } from '@tanstack/react-router'
import { Goals } from '@/features/goals'

export const Route = createFileRoute('/_authenticated/goals/')({
  component: Goals,
})
