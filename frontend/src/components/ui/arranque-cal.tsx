export function ArranqueCal() {
  return (
    <div role="status" className="fixed inset-0 z-[9999] flex bg-background">
      <span className="sr-only">Cargando Kabin-e</span>
      <div aria-hidden className="hidden lg:block w-72 shrink-0 bg-sunken border-r-[1.5px] border-line p-6">
        <div className="space-y-4">
          {[40, 56, 48, 64, 44, 52].map((w, i) => (
            <div key={i} className="h-3 bg-border" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
      <div aria-hidden className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <div className="cal-linea bg-card grid grid-cols-7 h-14 mb-6">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className={i > 0 ? 'border-l border-border' : ''} />
          ))}
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 w-full bg-sunken" />
          ))}
        </div>
      </div>
    </div>
  )
}
