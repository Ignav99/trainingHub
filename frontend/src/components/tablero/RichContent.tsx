import { cn } from '@/lib/utils'
import { segmentar } from './tablero-utils'

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]])/g

function TextoConEnlaces({ texto }: { texto: string }) {
  const partes = texto.split(URL_RE)
  return (
    <>
      {partes.map((p, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={p}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[hsl(var(--club-primary))] underline underline-offset-2 break-all"
          >
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  )
}

export function RichContent({
  contenido,
  meId,
  className,
}: {
  contenido: string
  meId?: string
  className?: string
}) {
  const segmentos = segmentar(contenido)
  return (
    <div className={cn('whitespace-pre-wrap break-words text-sm leading-relaxed', className)}>
      {segmentos.map((s, i) =>
        s.tipo === 'texto' ? (
          <TextoConEnlaces key={i} texto={s.texto} />
        ) : (
          <span
            key={i}
            className={cn(
              'rounded px-1 py-px font-medium',
              s.id === meId?.toLowerCase()
                ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100'
                : 'bg-[hsl(var(--club-primary)/0.1)] text-[hsl(var(--club-primary))]'
            )}
          >
            @{s.nombre}
          </span>
        )
      )}
    </div>
  )
}
