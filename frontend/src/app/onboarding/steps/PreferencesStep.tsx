'use client'

import Image from 'next/image'
import { Shield, Users, Palette, Bot, Bell, CheckCircle2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { ClubData, TeamData, PreferencesData } from '../page'

interface Props {
  data: PreferencesData
  onChange: (data: PreferencesData) => void
  clubData: ClubData
  teamData: TeamData
  playersCount: number
}

export function PreferencesStep({ data, onChange, clubData, teamData, playersCount }: Props) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Resumen y preferencias</h2>
        <p className="text-muted-foreground mt-1">
          Revisa la configuración y ajusta las últimas preferencias antes de empezar.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-start gap-3 p-4 rounded-xl border bg-muted/20">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0"
            style={{ backgroundColor: clubData.colorPrimario }}
          >
            {clubData.logoPreview ? (
              <Image src={clubData.logoPreview} alt="Club logo" width={28} height={28} className="object-contain" unoptimized />
            ) : (
              <Shield className="h-5 w-5" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium">{clubData.nombre}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: clubData.colorPrimario }} />
              <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: clubData.colorSecundario }} />
              <span className="text-xs text-muted-foreground ml-1">Colores del club</span>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl border bg-muted/20">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">{teamData.nombre}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {teamData.categoria} | {teamData.sistemaJuego}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl border bg-muted/20">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">{playersCount} jugadores</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {playersCount === 0 ? 'Podrás añadirlos luego' : 'En la plantilla'}
            </p>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Preferencias</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">Notificaciones</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Recibe alertas de sesiones, RPE alto y eventos importantes
                </p>
              </div>
            </div>
            <Switch
              checked={data.notificaciones}
              onCheckedChange={(checked) => onChange({ ...data, notificaciones: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Bot className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">Asistente AI</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Usa inteligencia artificial para recomendaciones de sesiones y análisis
                </p>
              </div>
            </div>
            <Switch
              checked={data.aiEnabled}
              onCheckedChange={(checked) => onChange({ ...data, aiEnabled: checked })}
            />
          </div>
        </div>
      </div>

      {/* Ready message */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
        <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-emerald-900">
            Todo listo para empezar
          </p>
          <p className="text-xs text-emerald-700 mt-0.5">
            Haz clic en "Completar configuración" para guardar y acceder a tu dashboard.
            Podrás modificar cualquier ajuste más adelante.
          </p>
        </div>
      </div>
    </div>
  )
}
