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
import * as XLSX from 'xlsx'
import { wellnessApi, type WellnessBulkItem } from '@/lib/api/wellness'
import type { Jugador } from '@/lib/api/jugadores'

interface ParsedRow {
  jugador_nombre: string
  fecha: string
  sueno: number
  fatiga: number
  dolor: number
  estres: number
  humor: number
  matched_jugador_id: string | null
  total: number
}

interface ExcelImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jugadores: Jugador[]
}

type Step = 'upload' | 'preview' | 'importing' | 'done'

export function ExcelImportDialog({ open, onOpenChange, jugadores }: ExcelImportDialogProps) {
  const [step, setStep] = useState<Step>('upload')
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [importResult, setImportResult] = useState<{ imported: number } | null>(null)
  const [importDate, setImportDate] = useState(new Date().toISOString().split('T')[0])

  const resetState = () => {
    setStep('upload')
    setParsedRows([])
    setImportResult(null)
    setImportDate(new Date().toISOString().split('T')[0])
  }

  const handleClose = (open: boolean) => {
    if (!open) resetState()
    onOpenChange(open)
  }

  // Strip leading number prefix ("6. Babacar Ba" → "Babacar Ba", "12.Juan" → "Juan")
  const stripNumberPrefix = (name: string): string =>
    name.replace(/^\d+[\.\)\-\s]+\s*/, '').trim()

  // Build lookup maps for matching
  const matchJugador = useCallback((rawNombre: string): string | null => {
    const cleaned = stripNumberPrefix(rawNombre)
    const normalizado = cleaned.toLowerCase().trim()
    if (!normalizado) return null

    // Build all possible name forms for each player
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
        // Partial: Excel has "nombre apellido1" but DB has "nombre apellido1 apellido2"
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
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet)

      if (json.length === 0) {
        toast.error('El archivo esta vacio')
        return
      }

      // Build a case-insensitive, accent-insensitive column lookup
      const colKeys = json.length > 0 ? Object.keys(json[0]) : []
      const findCol = (...candidates: string[]): string | undefined => {
        const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()
        for (const candidate of candidates) {
          const nc = normalize(candidate)
          const found = colKeys.find((k) => normalize(k).includes(nc))
          if (found) return found
        }
        return undefined
      }

      const colNombre = findCol('nombre del jugador', 'jugador', 'nombre', 'player')
      const colFatiga = findCol('fatiga', 'fatigue')
      const colSueno = findCol('sueno', 'sueño', 'sleep')
      const colDolor = findCol('dolor', 'pain', 'soreness')
      const colEstres = findCol('estres', 'estrés', 'stress')
      const colHumor = findCol('humor', 'animo', 'estado de animo', 'mood')

      const rows: ParsedRow[] = json.map((row) => {
        const getStr = (col: string | undefined) => col ? String(row[col] ?? '') : ''
        const getNum = (col: string | undefined) => {
          if (!col) return 3
          const v = row[col]
          if (v === undefined || v === null || v === '') return 3
          return Math.min(5, Math.max(1, Math.round(Number(v))))
        }

        const nombre = getStr(colNombre)
        const sueno = getNum(colSueno)
        const fatiga = getNum(colFatiga)
        const dolor = getNum(colDolor)
        const estres = getNum(colEstres)
        const humor = getNum(colHumor)

        const cleanedNombre = stripNumberPrefix(nombre)

        return {
          jugador_nombre: cleanedNombre || nombre,
          fecha: importDate,
          sueno,
          fatiga,
          dolor,
          estres,
          humor,
          matched_jugador_id: matchJugador(nombre),
          total: sueno + fatiga + dolor + estres + humor,
        }
      })

      const matched = rows.filter((r) => r.matched_jugador_id).length
      const unmatched = rows.filter((r) => !r.matched_jugador_id).length

      if (unmatched > 0) {
        toast.warning(`${unmatched} jugador${unmatched > 1 ? 'es' : ''} no encontrado${unmatched > 1 ? 's' : ''} — asignalos manualmente`)
      }

      setParsedRows(rows)
      setStep('preview')
    } catch (err) {
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
        fecha: importDate,
        sueno: r.sueno,
        fatiga: r.fatiga,
        dolor: r.dolor,
        estres: r.estres,
        humor: r.humor,
      }))

      const result = await wellnessApi.bulkImport(items)
      setImportResult(result)
      setStep('done')
      toast.success(`${result.imported} registros importados`)
      mutate((key: string) => typeof key === 'string' && (key.includes('/wellness') || key.includes('/carga')), undefined, { revalidate: true })
    } catch (err: any) {
      toast.error(err.message || 'Error al importar')
      setStep('preview')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Wellness desde Excel</DialogTitle>
          <DialogDescription>
            Compatible con Google Forms. Detecta columnas automaticamente (Fatiga, Sueño, Dolor, Estres, Estado de Animo).
            Los prefijos numericos en nombres (ej: &quot;6. Babacar Ba&quot;) se eliminan automaticamente.
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
              />
              <p className="text-xs text-muted-foreground">
                Todos los registros importados se guardan con esta fecha
              </p>
            </div>

            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Arrastra o selecciona un archivo .xlsx / .xls
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
                Fecha: {importDate}
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
                    <th className="pb-2 font-medium text-center text-[10px]">Dol</th>
                    <th className="pb-2 font-medium text-center text-[10px]">Est</th>
                    <th className="pb-2 font-medium text-center text-[10px]">Hum</th>
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
                      <td className="py-1.5 text-center text-xs">{row.dolor}</td>
                      <td className="py-1.5 text-center text-xs">{row.estres}</td>
                      <td className="py-1.5 text-center text-xs">{row.humor}</td>
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
