import Link from 'next/link'
import { Swords, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PartidoFilters() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Swords className="h-6 w-6 text-primary" />
          Partidos
        </h1>
        <p className="text-muted-foreground mt-1">Pre-partido, convocatoria y post-partido</p>
      </div>
      <Button asChild>
        <Link href="/partidos/nuevo">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Partido
        </Link>
      </Button>
    </div>
  )
}
