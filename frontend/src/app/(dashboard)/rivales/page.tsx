'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import useSWR, { mutate } from 'swr'
import {
  Shield,
  Plus,
  Search,
  Edit3,
  Trash2,
  Loader2,
  MapPin,
  Building,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { apiKey } from '@/lib/swr'
import { CardGridSkeleton } from '@/components/ui/page-skeletons'
import { rivalesApi, RivalCreateData } from '@/lib/api/partidos'
import type { Rival, PaginatedResponse } from '@/types'

export default function RivalesPage() {
  const [search, setSearch] = useState('')

  // SWR for rivales list
  const { data: rivalesResponse, isLoading: loading } = useSWR<PaginatedResponse<Rival>>(
    apiKey('/rivales', {
      busqueda: search || undefined,
      orden: 'nombre',
      direccion: 'asc',
    })
  )
  const rivales = rivalesResponse?.data || []

  // Create/Edit dialog
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<RivalCreateData>({
    nombre: '',
    nombre_corto: '',
    escudo_url: '',
    estadio: '',
    ciudad: '',
    notas: '',
  })
  const [saving, setSaving] = useState(false)

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleSave = async () => {
    if (!form.nombre.trim()) return
    setSaving(true)
    try {
      if (editingId) {
        await rivalesApi.update(editingId, form)
      } else {
        await rivalesApi.create(form)
      }
      setShowForm(false)
      setEditingId(null)
      setForm({ nombre: '', nombre_corto: '', escudo_url: '', estadio: '', ciudad: '', notas: '' })
      mutate((key: string) => typeof key === 'string' && key.includes('/rivales'), undefined, { revalidate: true })
    } catch (err: any) {
      toast.error(err.message || 'Error')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (r: Rival) => {
    setEditingId(r.id)
    setForm({
      nombre: r.nombre,
      nombre_corto: r.nombre_corto || '',
      escudo_url: r.escudo_url || '',
      estadio: r.estadio || '',
      ciudad: r.ciudad || '',
      notas: r.notas || '',
    })
    setShowForm(true)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await rivalesApi.delete(deleteId)
      setDeleteId(null)
      mutate((key: string) => typeof key === 'string' && key.includes('/rivales'), undefined, { revalidate: true })
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Rivales
          </h1>
          <p className="text-muted-foreground mt-1">Equipos rivales de la competicion</p>
        </div>
        <Button onClick={() => { setEditingId(null); setForm({ nombre: '', nombre_corto: '', escudo_url: '', estadio: '', ciudad: '', notas: '' }); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Rival
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar rival..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* List */}
      {loading ? (
        <CardGridSkeleton />
      ) : rivales.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-medium mb-1">Sin rivales</h3>
            <p className="text-sm text-muted-foreground mb-4">Anade los equipos contra los que compites</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" /> Nuevo Rival
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rivales.map((rival) => (
            <Card key={rival.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <Link href={`/rivales/${rival.id}`} className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      {rival.escudo_url ? (
                        <Image src={rival.escudo_url} alt="" width={32} height={32} className="object-contain" unoptimized />
                      ) : (
                        <Shield className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">{rival.nombre}</h3>
                      {rival.nombre_corto && (
                        <p className="text-xs text-muted-foreground">{rival.nombre_corto}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-1">
                        {rival.ciudad && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" /> {rival.ciudad}
                          </span>
                        )}
                        {rival.estadio && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Building className="h-3 w-3" /> {rival.estadio}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(rival)}>
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(rival.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditingId(null) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Rival' : 'Nuevo Rival'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Real Madrid CF" />
            </div>
            <div className="space-y-2">
              <Label>Nombre corto</Label>
              <Input value={form.nombre_corto} onChange={(e) => setForm({ ...form, nombre_corto: e.target.value })} placeholder="Ej: R. Madrid" />
            </div>
            <div className="space-y-2">
              <Label>URL del escudo</Label>
              <Input value={form.escudo_url} onChange={(e) => setForm({ ...form, escudo_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Ciudad</Label>
                <Input value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} placeholder="Madrid" />
              </div>
              <div className="space-y-2">
                <Label>Estadio</Label>
                <Input value={form.estadio} onChange={(e) => setForm({ ...form, estadio: e.target.value })} placeholder="Santiago Bernabeu" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={2} placeholder="Estilo de juego, puntos fuertes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null) }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.nombre.trim()}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editingId ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar rival</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Se eliminara el rival. Los partidos asociados se mantendran.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
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
