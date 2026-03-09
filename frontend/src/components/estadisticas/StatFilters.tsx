'use client'

import { Loader2, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface StatFiltersProps {
  fechaDesde: string
  fechaHasta: string
  onFechaDesdeChange: (value: string) => void
  onFechaHastaChange: (value: string) => void
  onFilter: () => void
  loading: boolean
}

export function StatFilters({
  fechaDesde,
  fechaHasta,
  onFechaDesdeChange,
  onFechaHastaChange,
  onFilter,
  loading,
}: StatFiltersProps) {
  return (
    <div className="flex items-end gap-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Desde</label>
        <Input
          type="date"
          value={fechaDesde}
          onChange={(e) => onFechaDesdeChange(e.target.value)}
          className="w-40"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Hasta</label>
        <Input
          type="date"
          value={fechaHasta}
          onChange={(e) => onFechaHastaChange(e.target.value)}
          className="w-40"
        />
      </div>
      <Button size="sm" onClick={onFilter} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Calendar className="h-4 w-4 mr-1" />}
        Filtrar
      </Button>
    </div>
  )
}
