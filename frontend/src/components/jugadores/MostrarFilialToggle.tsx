'use client'

import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFilialVisibilityStore } from '@/stores/filialVisibilityStore'

export function MostrarFilialToggle({ className }: { className?: string }) {
  const mostrarFilial = useFilialVisibilityStore((s) => s.mostrarFilial)
  const toggleMostrarFilial = useFilialVisibilityStore((s) => s.toggleMostrarFilial)

  return (
    <Button
      type="button"
      variant={mostrarFilial ? 'default' : 'outline'}
      size="sm"
      onClick={toggleMostrarFilial}
      className={className}
      aria-pressed={mostrarFilial}
    >
      <Users className="h-4 w-4 mr-2" />
      {mostrarFilial ? 'Ocultar filial' : 'Mostrar jugadores del filial'}
    </Button>
  )
}
