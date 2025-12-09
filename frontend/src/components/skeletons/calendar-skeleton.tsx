// path: src/components/skeletons/calendar-skeleton.tsx

import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function CalendarSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Time slots */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-16 w-16" />
              <Skeleton className="h-16 flex-1 rounded-lg" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function MonthCalendarSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Day headers */}
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={`header-${i}`} className="h-8 w-full" />
          ))}
          {/* Calendar days */}
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={`day-${i}`} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

