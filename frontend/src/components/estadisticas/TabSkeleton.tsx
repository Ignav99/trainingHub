'use client'

export function TabSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-lg" />
        ))}
      </div>
      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="h-72 bg-muted rounded-lg" />
        <div className="h-72 bg-muted rounded-lg" />
      </div>
      <div className="h-64 bg-muted rounded-lg" />
    </div>
  )
}
