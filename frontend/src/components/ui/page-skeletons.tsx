import { Skeleton } from '@/components/ui/skeleton'

/** Dashboard: stat cards + calendar placeholder */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Top bar */}
      <Skeleton className="h-20 w-full rounded-2xl" />
      {/* Stat cards row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
      {/* Calendar */}
      <Skeleton className="h-[480px] rounded-lg" />
      {/* Action buttons */}
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 flex-1 rounded-lg" />
      </div>
    </div>
  )
}

/** List pages: header + filter bar + rows (sesiones, tareas, partidos, etc.) */
export function ListPageSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  )
}

/** Detail pages: title + content sections (sesion/[id], partido/[id], etc.) */
export function DetailPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Back button + title */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-7 w-64" />
      </div>
      {/* Main content card */}
      <Skeleton className="h-48 rounded-lg" />
      {/* Secondary sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  )
}

/** Card grid: grid of cards (plantilla, rivales) */
export function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <Skeleton key={i} className="h-40 rounded-lg" />
      ))}
    </div>
  )
}
