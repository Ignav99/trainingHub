'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Swords,
  ChevronLeft,
  Calendar,
  MapPin,
  Trophy,
  Edit3,
  Trash2,
  Loader2,
  Users,
  FileText,
  ClipboardList,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { PageLoader } from '@/components/ui/page-loader'
import { usePageReady } from '@/components/providers/PageReadyProvider'
import { useEquipoStore } from '@/stores/equipoStore'
import { partidosApi } from '@/lib/api/partidos'
import { formatDate } from '@/lib/utils'
import type { Partido } from '@/types'

const RESULTADO_LABELS: Record<string, { label: string; color: string }> = {
  victoria: { label: 'Victoria', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  empate: { label: 'Empate', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  derrota: { label: 'Derrota', color: 'bg-red-100 text-red-800 border-red-300' },
}

export default function PartidoDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { equipoActivo } = useEquipoStore()
  const id = params.id as string

  const [partido, setPartido] = useState<Partido | null>(null)
  const [loading, setLoading] = useState(true)

  // Result dialog
  const [showResult, setShowResult] = useState(false)
  const [resultForm, setResultForm] = useState({ goles_favor: 0, goles_contra: 0, notas_post: '' })
  const [saving, setSaving] = useState(false)

  // Informe PDF
  const [generatingPdf, setGeneratingPdf] = useState(false)

  // Delete
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    partidosApi
      .get(id)
      .then(setPartido)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  usePageReady(loading)

  const handleSaveResult = async () => {
    setSaving(true)
    try {
      const updated = await partidosApi.registrarResultado(
        id,
        resultForm.goles_favor,
        resultForm.goles_contra,
        resultForm.notas_post || undefined
      )
      setPartido(updated)
      setShowResult(false)
    } catch (err: any) {
      alert(err.message || 'Error al registrar resultado')
    } finally {
      setSaving(false)
    }
  }

  const handleGenerarInforme = async () => {
    setGeneratingPdf(true)
    try {
      const result = await partidosApi.generarInforme(id)
      if (result.informe_url) {
        window.open(result.informe_url, '_blank')
        setPartido((prev) => prev ? { ...prev, informe_url: result.informe_url } : prev)
      }
    } catch (err: any) {
      alert(err.message || 'Error al generar el informe')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await partidosApi.delete(id)
      router.push('/partidos')
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <PageLoader />
  }

  if (!partido) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Partido no encontrado</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/partidos">Volver</Link>
        </Button>
      </div>
    )
  }

  const resInfo = partido.resultado ? RESULTADO_LABELS[partido.resultado] : null

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <Link href="/partidos" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" /> Partidos
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/partidos/${id}/plan`}>
              <ClipboardList className="h-4 w-4 mr-2" />
              Plan de partido
            </Link>
          </Button>
          <Button variant="outline" onClick={handleGenerarInforme} disabled={generatingPdf}>
            {generatingPdf ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
            Generar informe
          </Button>
          {!partido.resultado && (
            <Button onClick={() => setShowResult(true)}>
              <Trophy className="h-4 w-4 mr-2" />
              Registrar resultado
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => setShowDelete(true)} className="text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main card */}
      <Card className={resInfo ? `border-2 ${resInfo.color.split(' ')[0].replace('bg-', 'border-')}` : ''}>
        <CardContent className="p-6">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Badge variant="outline">{partido.competicion}</Badge>
              {partido.jornada && <span className="text-sm text-muted-foreground">Jornada {partido.jornada}</span>}
            </div>

            <div className="flex items-center justify-center gap-6">
              <div className="text-right flex-1">
                <p className="text-lg font-bold">
                  {equipoActivo?.nombre || 'Mi equipo'}
                </p>
                <p className="text-xs text-muted-foreground uppercase">
                  {partido.localia === 'local' ? 'Local' : 'Visitante'}
                </p>
              </div>

              {partido.resultado ? (
                <div className="text-center px-4">
                  <p className="text-4xl font-black">{partido.goles_favor} - {partido.goles_contra}</p>
                  <Badge className={resInfo?.color || ''}>{resInfo?.label}</Badge>
                </div>
              ) : (
                <div className="text-center px-4">
                  <p className="text-3xl font-bold text-muted-foreground">vs</p>
                </div>
              )}

              <div className="text-left flex-1">
                <p className="text-lg font-bold">
                  {partido.rival?.nombre || 'Rival'}
                </p>
                <p className="text-xs text-muted-foreground uppercase">
                  {partido.localia === 'local' ? 'Visitante' : 'Local'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(partido.fecha)}
              </span>
              {partido.hora && <span>{partido.hora}h</span>}
              {partido.ubicacion && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {partido.ubicacion}
                </span>
              )}
            </div>
            {partido.auto_creado && (
              <p className="text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-md inline-block mt-2">
                Partido importado desde RFAF
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {partido.notas_pre && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Notas previas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{partido.notas_pre}</p>
            </CardContent>
          </Card>
        )}
        {partido.notas_post && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Notas post-partido</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{partido.notas_post}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Links */}
      <div className="flex gap-2 flex-wrap">
        {partido.video_url && (
          <Button variant="outline" size="sm" asChild>
            <a href={partido.video_url} target="_blank" rel="noopener noreferrer">
              <FileText className="h-4 w-4 mr-1" /> Video
            </a>
          </Button>
        )}
        {partido.informe_url && (
          <Button variant="outline" size="sm" asChild>
            <a href={partido.informe_url} target="_blank" rel="noopener noreferrer">
              <FileText className="h-4 w-4 mr-1" /> Informe
            </a>
          </Button>
        )}
      </div>

      {/* Result dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar resultado</DialogTitle>
            <DialogDescription>
              {partido.localia === 'local' ? 'vs' : '@'} {partido.rival?.nombre}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Goles a favor</Label>
                <Input
                  type="number"
                  min={0}
                  value={resultForm.goles_favor}
                  onChange={(e) => setResultForm({ ...resultForm, goles_favor: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Goles en contra</Label>
                <Input
                  type="number"
                  min={0}
                  value={resultForm.goles_contra}
                  onChange={(e) => setResultForm({ ...resultForm, goles_contra: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas post-partido</Label>
              <Textarea
                placeholder="Observaciones del partido..."
                rows={3}
                value={resultForm.notas_post}
                onChange={(e) => setResultForm({ ...resultForm, notas_post: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResult(false)}>Cancelar</Button>
            <Button onClick={handleSaveResult} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Guardar resultado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar partido</DialogTitle>
            <DialogDescription>Esta accion no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

