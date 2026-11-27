import { materialDeTareas } from '@/lib/materialSesion'
import { cn } from '@/lib/utils'

/**
 * Material mínimo necesario de la sesión: unión del material de sus tareas.
 * Solo lectura, como la duración total: se calcula solo.
 */
export function SesionMaterialMinimo({
  materialPorTarea,
  className,
}: {
  materialPorTarea: unknown[]
  className?: string
}) {
  const material = materialDeTareas(materialPorTarea)
  return (
    <section
      aria-label="Material mínimo necesario"
      className={cn('border border-border bg-card rounded-md px-3 py-2', className)}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-xs font-semibold text-foreground">Material mínimo necesario</h3>
        {material.length > 0 ? (
          <p className="text-sm text-foreground">{material.join(' · ')}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Ninguna tarea declara material todavía.
          </p>
        )}
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Se calcula de las tareas. Edítalo en cada tarea.
      </p>
    </section>
  )
}
