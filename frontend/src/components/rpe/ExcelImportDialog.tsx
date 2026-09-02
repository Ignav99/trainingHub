'use client'

import { useState, useCallback } from 'react'
import { Upload, Loader2, Check, AlertTriangle, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import { mutate } from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { wellnessApi, type WellnessBulkItem } from '@/lib/api/wellness'
import { parseWellnessSheet, type WellnessParsedRow } from '@/lib/wellnessExcel'
import type { Jugador } from '@/lib/api/jugadores'

interface PreviewRow extends WellnessParsedRow {
  matched_jugador_id: string | null
}

interface ExcelImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jugadores: Jugador[]
}

type Step = 'upload' | 'preview' | 'importing' | 'done'

export function ExcelImportDialog({ open, onOpenChange, jugadores }: ExcelImportDialogProps) {
  const [step, setStep] = useState<Step>('upload')
  const [parsedRows, setParsedRows] = useState<PreviewRow[]>([])
  const [importResult, setImportResult] = useState<{ imported: number } | null>(null)
  const [importDate, setImportDate] = useState(new Date().toISOString().split('T')[0])
  const [importAllDates, setImportAllDates] = useState(false)

  const resetState = () => {
    setStep('upload')
    setParsedRows([])
    setImportResult(null)
    setImportDate(new Date().toISOString().split('T')[0])
    setImportAllDates(false)
  }

  const handleClose = (open: boolean) => {
    if (!open) resetState()
    onOpenChange(open)
  }

  const matchJugador = useCallback((rawNombre: string): string | null => {
    const normalizado = rawNombre.toLowerCase().trim()
    if (!normalizado) return null

    for (const j of jugadores) {
      const fullName = `${j.nombre} ${j.apellidos}`.toLowerCase().trim()
      const nameOnly = j.nombre.toLowerCase().trim()
      const surnameOnly = (j.apellidos || '').toLowerCase().trim()
      const apodo = (j.apodo || '').toLowerCase().trim()

      if (
        normalizado === fullName ||
        normalizado === nameOnly ||
        (surnameOnly && normalizado === surnameOnly) ||
        (apodo && normalizado === apodo) ||
        (fullName.startsWith(normalizado) && normalizado.length > 3) ||
        (normalizado.startsWith(fullName) && fullName.length > 3)
      ) {
        return j.id
      }
    }

    return null
  }, [jugadores])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const XLSX = await import('xlsx')
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data, { type: 'array', cellDates: true })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

      if (json.length === 0) {
        toast.error('El archivo está vacío')
        return
      }

      const parsed = parseWellnessSheet(json)
      let filtered = parsed.rows
      if (!importAllDates && parsed.columns.fecha) {
        filtered = parsed.rows.filter((row) => row.fecha === importDate)
        if (filtered.length === 0) {
          const sample = parsed.fechasEnArchivo.slice(0, 8).join(', ') || 'ninguna reconocida'
          toast.error(
            `No hay registros para el ${importDate} (${json.length} filas). Fechas en el Excel: ${sample}`,
          )
          return
        }
        if (filtered.length < parsed.rows.length) {
          toast.info(`Filtrado: ${filtered.length} de ${parsed.rows.length} filas del ${importDate}`)
        }
      }

      const rows: PreviewRow[] = filtered.map((row) => ({
        ...row,
        fecha: row.fecha || importDate,
        matched_jugador_id: matchJugador(row.jugador_nombre),
      }))

      const unmatched = rows.filter((r) => !r.matched_jugador_id).length
      if (unmatched > 0) {
        toast.warning(`${unmatched} jugador${unmatched > 1 ? 'es' : ''} no encontrado${unmatched > 1 ? 's' : ''} — asígnalos manualmente`)
      }

      setParsedRows(rows)
      setStep('preview')
    } catch (err) {
      console.error(err)
      toast.error('Error al leer el archivo Excel')
    }
  }

  const handleMatchOverride = (index: number, jugadorId: string) => {
    setParsedRows((prev) =>
      prev.map((r, i) => i === index ? { ...r, matched_jugador_id: jugadorId || null } : r)
    )
  }

  const matchedRows = parsedRows.filter((r) => r.matched_jugador_id)
  const unmatchedRows = parsedRows.filter((r) => !r.matched_jugador_id)

  const handleImport = async () => {
    const toImport = parsedRows.filter((r) => r.matched_jugador_id)
    if (toImport.length === 0) {
      toast.error('No hay registros para importar')
      return
    }

    setStep('importing')
    try {
      const items: WellnessBulkItem[] = toImport.map((r) => ({
        jugador_id: r.matched_jugador_id!,
        fecha: r.fecha || importDate,
        sueno: r.sueno,
        fatiga: r.fatiga,
        dolor: r.dolor,
        estres: r.estres,
        humor: r.humor,
        horas_sueno: r.horas_sueno,
        molestia: r.molestia,
        molestia_texto: r.molestia ? (r.molestia_texto || null) : null,
      }))

      const result = await wellnessApi.bulkImport(items)
      setImportResult(result)
      setStep('done')
      toast.success(`${result.imported} registros importados`)
      mutate((key: string) => typeof key === 'string' && (key.includes('/wellness') || key.includes('/carga')), undefined, { revalidate: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al importar'
      toast.error(message)
      setStep('preview')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Wellness desde Excel</DialogTitle>
          <DialogDescription>
            Mismo formato que el formulario (Google Forms): calidad del sueño, horas de sueño,
            fatiga, dolor, molestia (sí/no + texto), estrés y estado de ánimo. Fechas en día/mes/año.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fecha del registro *</Label>
              <Input
                type="date"
                value={importDate}
                onChange={(e) => setImportDate(e.target.value)}
                disabled={importAllDates}
              />
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={importAllDates}
                  onChange={(e) => setImportAllDates(e.target.checked)}
                />
                Importar todas las fechas del archivo
              </label>
              {!importAllDates ? (
                <p className="text-xs text-muted-foreground">
                  Solo se importan las filas cuya marca temporal coincida con esta fecha (día/mes).
                </p>
              ) : null}
            </div>

            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Arrastra o selecciona un archivo .xlsx / .xls / .csv
              </p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Seleccionar archivo
                  </span>
                </Button>
              </label>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Badge variant="outline" className="bg-green-50">
                {matchedRows.length} emparejados
              </Badge>
              {unmatchedRows.length > 0 && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {unmatchedRows.length} no encontrado{unmatchedRows.length > 1 ? 's' : ''}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                Fecha: {importAllDates ? 'varias' : importDate}
              </span>
            </div>

            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Nombre (Excel)</th>
                    <th className="pb-2 font-medium">Jugador asignado</th>
                    <th className="pb-2 font-medium text-center text-[10px]">Fat</th>
                    <th className="pb-2 font-medium text-center text-[10px]">Sue</th>
                    <th className="pb-2 font-medium text-center text-[10px]">Hrs</th>
                    <th className="pb-2 font-medium text-center text-[10px]">Dol</th>
                    <th className="pb-2 font-medium text-center text-[10px]">Est</th>
                    <th className="pb-2 font-medium text-center text-[10px]">Hum</th>
                    <th className="pb-2 font-medium text-[10px]">Molestia</th>
                    <th className="pb-2 font-medium text-center">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, i) => (
                    <tr key={i} className={`border-b ${!row.matched_jugador_id ? 'bg-red-50/60' : ''}`}>
                      <td className="py-1.5 text-xs">
                        <div className="flex items-center gap-1">
                          {!row.matched_jugador_id && (
                            <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                          )}
                          {row.jugador_nombre}
                        </div>
                      </td>
                      <td className="py-1.5">
                        <select
                          className={`w-full rounded border px-2 py-1 text-xs ${!row.matched_jugador_id ? 'border-red-300 bg-red-50' : 'bg-background'}`}
                          value={row.matched_jugador_id || ''}
                          onChange={(e) => handleMatchOverride(i, e.target.value)}
                        >
                          <option value="">-- Sin asignar --</option>
                          {jugadores.map((j) => (
                            <option key={j.id} value={j.id}>
                              {j.dorsal ? `${j.dorsal}. ` : ''}{j.nombre} {j.apellidos}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 text-center text-xs">{row.fatiga}</td>
                      <td className="py-1.5 text-center text-xs">{row.sueno}</td>
                      <td className="py-1.5 text-center text-xs">{row.horas_sueno ?? '—'}</td>
                      <td className="py-1.5 text-center text-xs">{row.dolor}</td>
                      <td className="py-1.5 text-center text-xs">{row.estres}</td>
                      <td className="py-1.5 text-center text-xs">{row.humor}</td>
                      <td className="py-1.5 text-[11px] max-w-[9rem]">
                        {row.molestia
                          ? <span className="text-red-700">{row.molestia_texto || 'Sí'}</span>
                          : row.molestia === false
                            ? 'No'
                            : '—'}
                      </td>
                      <td className={`py-1.5 text-center font-bold text-xs ${
                        row.total >= 20 ? 'text-green-600' : row.total >= 15 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {row.total}/25
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { resetState() }}>
                Volver
              </Button>
              <Button onClick={handleImport} disabled={matchedRows.length === 0}>
                Importar {matchedRows.length} registros
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'importing' && (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
            <p className="text-sm text-muted-foreground">Importando registros...</p>
          </div>
        )}

        {step === 'done' && importResult && (
          <div className="text-center py-8 space-y-4">
            <Check className="h-12 w-12 text-green-500 mx-auto" />
            <div>
              <p className="text-lg font-bold">{importResult.imported} registros importados</p>
              <p className="text-sm text-muted-foreground">Los datos de wellness se han actualizado</p>
            </div>
            <Button onClick={() => handleClose(false)}>Cerrar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
