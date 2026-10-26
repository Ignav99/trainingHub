'use client'

import Link from 'next/link'
import { useEquipoStore } from '@/stores/equipoStore'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { BibliotecaCortesPanel } from '@/components/biblioteca/BibliotecaCortesPanel'

export default function BibliotecaCortesPage() {
  const equipoId = useEquipoStore((s) => s.equipoActivo?.id || '')

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title="Biblioteca de cortes"
        description="Recortes etiquetados que se quedan en Cloudflare. Búscalos por partido, minuto, fase o jugador y mándalos a un informe o a un plan."
        actions={
          <Button variant="outline" asChild>
            <Link href="/video-analisis">Abrir Video Análisis</Link>
          </Button>
        }
      />
      {equipoId ? (
        <BibliotecaCortesPanel equipoId={equipoId} />
      ) : (
        <p className="text-sm text-muted-foreground">Elige un equipo para ver su biblioteca.</p>
      )}
    </div>
  )
}
