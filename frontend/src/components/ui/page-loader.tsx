/**
 * PageLoader — Football pitch skeleton with 4-3-3 formation dots pulsing sequentially.
 * Used by Next.js loading.tsx for route transitions inside the dashboard.
 */

const FORMATION_433: { top: number; left: number }[] = [
  // GK
  { top: 90, left: 50 },
  // Defenders (4)
  { top: 72, left: 15 },
  { top: 72, left: 38 },
  { top: 72, left: 62 },
  { top: 72, left: 85 },
  // Midfielders (3)
  { top: 48, left: 25 },
  { top: 48, left: 50 },
  { top: 48, left: 75 },
  // Forwards (3)
  { top: 24, left: 20 },
  { top: 24, left: 50 },
  { top: 24, left: 80 },
]

export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6">
      {/* Mini pitch */}
      <div
        className="relative border-2 border-border/60 rounded-lg bg-muted/20"
        style={{ width: 192, height: 256 }}
      >
        {/* Center line */}
        <div className="absolute left-0 right-0 top-1/2 border-t-2 border-border/60" />
        {/* Center circle */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-border/60"
          style={{ width: 48, height: 48 }}
        />
        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-border/60" />

        {/* Penalty area top */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 border-2 border-t-0 border-border/60 rounded-b-sm"
          style={{ width: 96, height: 40 }}
        />
        {/* Penalty area bottom */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 border-2 border-b-0 border-border/60 rounded-t-sm"
          style={{ width: 96, height: 40 }}
        />

        {/* Formation dots */}
        {FORMATION_433.map((pos, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 rounded-full bg-primary/70"
            style={{
              top: `${pos.top}%`,
              left: `${pos.left}%`,
              animation: `dotPulse 1.2s ease-in-out ${(i * 0.05).toFixed(2)}s infinite`,
            }}
          />
        ))}
      </div>

      <p className="text-sm text-muted-foreground animate-pulse">
        Preparando el campo...
      </p>
    </div>
  )
}
