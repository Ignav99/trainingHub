'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  Settings,
  User,
  Building,
  CreditCard,
  Save,
  Loader2,
  Upload,
  Check,
  Users,
  Copy,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { useClubStore } from '@/stores/clubStore'
import { organizacionApi, type Miembro } from '@/lib/api/organizacion'
import { equiposApi } from '@/lib/api/equipos'
import { invitacionesApi, type CreateInvitacionData } from '@/lib/api/invitaciones'
import { suscripcionesApi } from '@/lib/api/suscripciones'
import type { Suscripcion, UsageLimits, Invitacion, Equipo } from '@/types'

const ROLES_EQUIPO = [
  { value: 'segundo_entrenador', label: 'Segundo entrenador' },
  { value: 'preparador_fisico', label: 'Preparador fisico' },
  { value: 'entrenador_porteros', label: 'Entrenador de porteros' },
  { value: 'analista', label: 'Analista' },
  { value: 'fisio', label: 'Fisioterapeuta' },
  { value: 'delegado', label: 'Delegado' },
]

export default function ConfiguracionPage() {
  const user = useAuthStore((s) => s.user)
  const { organizacion, theme, updateTheme, setOrganizacion } = useClubStore()

  // Club settings
  const [clubName, setClubName] = useState(organizacion?.nombre || '')
  const [colorPrimario, setColorPrimario] = useState(theme.colorPrimario)
  const [colorSecundario, setColorSecundario] = useState(theme.colorSecundario)
  const [savingClub, setSavingClub] = useState(false)
  const [savedClub, setSavedClub] = useState(false)

  // Logo upload
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Subscription
  const [suscripcion, setSuscripcion] = useState<Suscripcion | null>(null)
  const [usage, setUsage] = useState<UsageLimits | null>(null)
  const [loadingSub, setLoadingSub] = useState(true)

  // Team tab
  const [miembros, setMiembros] = useState<Miembro[]>([])
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([])
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [loadingTeam, setLoadingTeam] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteData, setInviteData] = useState<CreateInvitacionData>({
    email: '',
    nombre: '',
    equipo_id: '',
    rol_en_equipo: '',
  })
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  useEffect(() => {
    if (organizacion) {
      setClubName(organizacion.nombre)
    }
  }, [organizacion])

  useEffect(() => {
    setLoadingSub(true)
    Promise.allSettled([
      suscripcionesApi.getCurrent(),
      suscripcionesApi.getUsage(),
    ])
      .then(([subRes, usageRes]) => {
        if (subRes.status === 'fulfilled') setSuscripcion(subRes.value)
        if (usageRes.status === 'fulfilled') setUsage(usageRes.value)
      })
      .finally(() => setLoadingSub(false))
  }, [])

  const loadTeamData = async () => {
    setLoadingTeam(true)
    try {
      const [miembrosRes, invRes, equiposRes] = await Promise.allSettled([
        organizacionApi.getMiembros(),
        invitacionesApi.list({ estado: 'pendiente' }),
        equiposApi.list(),
      ])
      if (miembrosRes.status === 'fulfilled') setMiembros(miembrosRes.value)
      if (invRes.status === 'fulfilled') setInvitaciones(invRes.value.data)
      if (equiposRes.status === 'fulfilled') setEquipos(equiposRes.value.data)
    } catch (err) {
      console.error('Error loading team data:', err)
    } finally {
      setLoadingTeam(false)
    }
  }

  const handleSaveClub = async () => {
    setSavingClub(true)
    try {
      const updated = await organizacionApi.update({
        nombre: clubName,
        color_primario: colorPrimario,
        color_secundario: colorSecundario,
      })
      setOrganizacion(updated)
      updateTheme({
        colorPrimario,
        colorSecundario,
      })
      setSavedClub(true)
      setTimeout(() => setSavedClub(false), 2000)
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar')
    } finally {
      setSavingClub(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    try {
      const res = await organizacionApi.uploadLogo(file)
      updateTheme({ logoUrl: res.logo_url })
    } catch (err: any) {
      toast.error(err.message || 'Error al subir logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleCreateInvite = async () => {
    if (!inviteData.email || !inviteData.rol_en_equipo) return
    setCreatingInvite(true)
    try {
      const result = await invitacionesApi.create({
        ...inviteData,
        equipo_id: inviteData.equipo_id || undefined,
      })
      const link = `${window.location.origin}/join?token=${result.token}`
      setInviteLink(link)
      // Refresh list
      const invRes = await invitacionesApi.list({ estado: 'pendiente' })
      setInvitaciones(invRes.data)
    } catch (err: any) {
      toast.error(err.message || 'Error al crear invitacion')
    } finally {
      setCreatingInvite(false)
    }
  }

  const handleCopyLink = async (link: string) => {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRevoke = async (id: string) => {
    setRevokingId(id)
    try {
      await invitacionesApi.revoke(id)
      setInvitaciones((prev) => prev.filter((i) => i.id !== id))
    } catch (err: any) {
      toast.error(err.message || 'Error al revocar')
    } finally {
      setRevokingId(null)
    }
  }

  const formatRole = (role: string) =>
    role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  const daysUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Configuracion
        </h1>
        <p className="text-muted-foreground mt-1">Ajustes del club, perfil, equipo y suscripcion</p>
      </div>

      <Tabs defaultValue="club" onValueChange={(v) => { if (v === 'equipo') loadTeamData() }}>
        <TabsList>
          <TabsTrigger value="club">
            <Building className="h-4 w-4 mr-1.5" /> Club
          </TabsTrigger>
          <TabsTrigger value="perfil">
            <User className="h-4 w-4 mr-1.5" /> Perfil
          </TabsTrigger>
          <TabsTrigger value="equipo">
            <Users className="h-4 w-4 mr-1.5" /> Equipo
          </TabsTrigger>
          <TabsTrigger value="suscripcion">
            <CreditCard className="h-4 w-4 mr-1.5" /> Suscripcion
          </TabsTrigger>
        </TabsList>

        {/* Club tab */}
        <TabsContent value="club" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Identidad del club</CardTitle>
              <CardDescription>Nombre, colores y escudo de tu organizacion</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre del club</Label>
                <Input
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  placeholder="Nombre de la organizacion"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Color primario</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={colorPrimario}
                      onChange={(e) => setColorPrimario(e.target.value)}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={colorPrimario}
                      onChange={(e) => setColorPrimario(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Color secundario</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={colorSecundario}
                      onChange={(e) => setColorSecundario(e.target.value)}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={colorSecundario}
                      onChange={(e) => setColorSecundario(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Logo upload */}
              <div className="space-y-2">
                <Label>Escudo / Logo</Label>
                <div className="flex items-center gap-4">
                  {theme.logoUrl ? (
                    <Image src={theme.logoUrl} alt="Logo" width={64} height={64} className="object-contain rounded-lg border" unoptimized />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                      style={{ backgroundColor: colorPrimario }}
                    >
                      {clubName?.charAt(0) || '?'}
                    </div>
                  )}
                  <div>
                    <input type="file" accept="image/*" className="hidden" id="logo-upload" onChange={handleLogoUpload} />
                    <Button variant="outline" size="sm" asChild disabled={uploadingLogo}>
                      <label htmlFor="logo-upload" className="cursor-pointer">
                        {uploadingLogo ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                        Cambiar logo
                      </label>
                    </Button>
                    <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG, SVG. Max 5MB</p>
                  </div>
                </div>
              </div>

              <Separator />

              <Button onClick={handleSaveClub} disabled={savingClub}>
                {savingClub ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : savedClub ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {savedClub ? 'Guardado' : 'Guardar cambios'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile tab */}
        <TabsContent value="perfil" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tu perfil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Nombre</Label>
                  <p className="font-medium">{user?.nombre} {user?.apellidos}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="font-medium">{user?.email}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Rol</Label>
                  <p className="font-medium capitalize">{user?.rol?.replace('_', ' ')}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Organizacion</Label>
                  <p className="font-medium">{organizacion?.nombre || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team tab */}
        <TabsContent value="equipo" className="space-y-6 mt-6">
          {loadingTeam ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Current members */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Miembros actuales</CardTitle>
                  <CardDescription>Usuarios con acceso a tu organizacion</CardDescription>
                </CardHeader>
                <CardContent>
                  {miembros.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay miembros registrados</p>
                  ) : (
                    <div className="space-y-3">
                      {miembros.map((m) => (
                        <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">
                              {m.nombre} {m.apellidos || ''}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            <Badge variant="outline" className="text-xs whitespace-nowrap">
                              {formatRole(m.rol)}
                            </Badge>
                            {m.usuarios_equipos?.map((ue) => (
                              <Badge key={ue.equipo_id} className="text-xs whitespace-nowrap bg-blue-100 text-blue-800">
                                {ue.equipos?.nombre || 'Equipo'} - {formatRole(ue.rol_en_equipo)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pending invitations */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Invitaciones pendientes</CardTitle>
                  <CardDescription>Invitaciones enviadas que aun no han sido aceptadas</CardDescription>
                </CardHeader>
                <CardContent>
                  {invitaciones.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay invitaciones pendientes</p>
                  ) : (
                    <div className="space-y-3">
                      {invitaciones.map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm">{inv.nombre || inv.email}</p>
                            <p className="text-xs text-muted-foreground">
                              {inv.email} · {inv.rol_en_equipo ? formatRole(inv.rol_en_equipo) : 'Sin rol'} · Expira en {daysUntil(inv.expira_en)} dias
                            </p>
                          </div>
                          <div className="flex items-center gap-1 ml-3">
                            {inv.token && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyLink(`${window.location.origin}/join?token=${inv.token}`)}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRevoke(inv.id)}
                              disabled={revokingId === inv.id}
                            >
                              {revokingId === inv.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* New invitation */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Nueva invitacion</CardTitle>
                      <CardDescription>Invita a un miembro de tu cuerpo tecnico</CardDescription>
                    </div>
                    {!showInviteForm && !inviteLink && (
                      <Button size="sm" onClick={() => setShowInviteForm(true)}>
                        <Plus className="h-4 w-4 mr-1" /> Invitar
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {inviteLink ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                        <p className="text-sm font-medium text-emerald-800 mb-2">Invitacion creada</p>
                        <p className="text-xs text-emerald-700 mb-3">Copia este enlace y envialo por WhatsApp:</p>
                        <div className="flex gap-2">
                          <Input value={inviteLink} readOnly className="text-xs font-mono bg-white" />
                          <Button
                            size="sm"
                            variant={copied ? 'default' : 'outline'}
                            onClick={() => handleCopyLink(inviteLink)}
                          >
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setInviteLink(null)
                          setShowInviteForm(false)
                          setInviteData({ email: '', nombre: '', equipo_id: '', rol_en_equipo: '' })
                        }}
                      >
                        Cerrar
                      </Button>
                    </div>
                  ) : showInviteForm ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            placeholder="email@ejemplo.com"
                            value={inviteData.email}
                            onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Nombre (opcional)</Label>
                          <Input
                            placeholder="Nombre del invitado"
                            value={inviteData.nombre}
                            onChange={(e) => setInviteData({ ...inviteData, nombre: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Rol en el equipo</Label>
                          <Select
                            value={inviteData.rol_en_equipo}
                            onValueChange={(v) => setInviteData({ ...inviteData, rol_en_equipo: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar rol" />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES_EQUIPO.map((r) => (
                                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {equipos.length > 0 && (
                          <div className="space-y-2">
                            <Label>Equipo</Label>
                            <Select
                              value={inviteData.equipo_id}
                              onValueChange={(v) => setInviteData({ ...inviteData, equipo_id: v })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar equipo" />
                              </SelectTrigger>
                              <SelectContent>
                                {equipos.map((eq) => (
                                  <SelectItem key={eq.id} value={eq.id}>{eq.nombre}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handleCreateInvite}
                          disabled={creatingInvite || !inviteData.email || !inviteData.rol_en_equipo}
                        >
                          {creatingInvite ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4 mr-2" />
                          )}
                          Crear invitacion
                        </Button>
                        <Button variant="ghost" onClick={() => setShowInviteForm(false)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Pulsa &quot;Invitar&quot; para anadir miembros a tu cuerpo tecnico
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Subscription tab */}
        <TabsContent value="suscripcion" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Plan actual</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSub ? (
                <div className="space-y-2">
                  <div className="h-8 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-48 bg-muted rounded animate-pulse" />
                </div>
              ) : suscripcion ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-sm px-3 py-1">
                      {suscripcion.plan?.nombre || 'Plan'}
                    </Badge>
                    <Badge className={
                      suscripcion.estado === 'active' ? 'bg-emerald-100 text-emerald-800' :
                      suscripcion.estado === 'trial' ? 'bg-blue-100 text-blue-800' :
                      'bg-amber-100 text-amber-800'
                    }>
                      {suscripcion.estado}
                    </Badge>
                  </div>

                  {usage && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Equipos</p>
                        <p className="font-bold">{usage.equipos} / {usage.max_equipos}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Llamadas AI (mes)</p>
                        <p className="font-bold">{usage.ai_calls_month} / {usage.max_ai_calls_month}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Documentos KB</p>
                        <p className="font-bold">{usage.kb_documents} / {usage.max_kb_documents}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Almacenamiento</p>
                        <p className="font-bold">{usage.storage_mb.toFixed(1)} / {usage.max_storage_mb} MB</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No se pudo cargar la informacion de suscripcion</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
