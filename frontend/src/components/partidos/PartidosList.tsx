import Link from 'next/link'
import { Calendar, Trophy, Swords, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PartidoCard } from './PartidoCard'
import type { Partido } from '@/types'

interface PartidosListProps {
  loading: boolean
  allPartidos: Partido[]
  proximos: Partido[]
  jugados: Partido[]
  selectedId: string | null
  onSelectMatch: (id: string) => void
}

export function PartidosList({
  loading,
  allPartidos,
  proximos,
  jugados,
  selectedId,
  onSelectMatch,
}: PartidosListProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    )
  }

  if (allPartidos.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Swords className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">Sin partidos</p>
          <Button asChild size="sm">
            <Link href="/partidos/nuevo">
              <Plus className="h-4 w-4 mr-2" /> Nuevo Partido
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {proximos.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider px-1 mb-1.5 text-primary flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Proximos ({proximos.length})
          </h2>
          <div className="space-y-1">
            {proximos.map((p, i) => (
              <PartidoCard
                key={p.id}
                partido={p}
                isSelected={selectedId === p.id}
                isNext={i === 0}
                onSelect={onSelectMatch}
              />
            ))}
          </div>
        </div>
      )}
      {jugados.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider px-1 mb-1.5 text-muted-foreground flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5" />
            Jugados ({jugados.length})
          </h2>
          <div className="space-y-1">
            {jugados.map((p) => (
              <PartidoCard
                key={p.id}
                partido={p}
                isSelected={selectedId === p.id}
                onSelect={onSelectMatch}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
