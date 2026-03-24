'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Swords, Trophy } from 'lucide-react'
import { ClubAvatar } from '@/components/ui/avatar'
import type { DashboardResumen, DashboardPlantilla } from '@/lib/api/dashboard'

interface NextMatchBannerProps {
  greeting: string
  userName: string | undefined
  theme: { colorPrimario: string; logoUrl?: string | null }
  clubName: string | undefined
  proximoPartido: DashboardResumen['proximo_partido'] | undefined
  ligaPosition: { posicion: number; puntos: number } | null
  plantilla: DashboardPlantilla | undefined
  loading: boolean
  onShowDisponibilidad: () => void
}

export function NextMatchBanner({
  greeting,
  userName,
  theme,
  clubName,
  proximoPartido,
  ligaPosition,
  plantilla,
  loading,
  onShowDisponibilidad,
}: NextMatchBannerProps) {
  return (
    <div
      className="-mt-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 rounded-b-2xl shadow-sm mb-2 animate-fade-in"
      style={{ backgroundColor: theme.colorPrimario }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Izquierda: saludo + rival */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shadow-inner shrink-0">
            {theme.logoUrl ? (
              <Image src={theme.logoUrl} alt="Club logo" width={32} height={32} className="object-contain" unoptimized />
            ) : (
              <ClubAvatar logoUrl={theme.logoUrl} clubName={clubName} size="lg" />
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">
              {greeting}, {userName}
            </h1>
            <div className="flex items-center gap-2 text-white/80 text-sm flex-wrap">
              {ligaPosition && (
                <Link
                  href="/estadisticas/competicion"
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 hover:bg-white/25 transition-colors text-white text-xs font-bold"
                >
                  <Trophy className="h-3 w-3" />
                  {ligaPosition.posicion}&#186; — {ligaPosition.puntos} pts
                </Link>
              )}
              {proximoPartido ? (
                <>
                  {proximoPartido.rival?.escudo_url ? (
                    <Image src={proximoPartido.rival.escudo_url} alt="" width={20} height={20} className="object-contain" unoptimized />
                  ) : (
                    <Swords className="h-4 w-4" />
                  )}
                  <span>
                    {proximoPartido.localia === 'local' ? 'vs' : '@ '}{' '}
                    <strong className="text-white">
                      {proximoPartido.rival?.nombre_corto || proximoPartido.rival?.nombre || 'Rival'}
                    </strong>
                  </span>
                  <span className="text-white/60">·</span>
                  <span>
                    {new Date(proximoPartido.fecha).toLocaleDateString('es-ES', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  {proximoPartido.hora && (
                    <span className="text-white/60">{proximoPartido.hora}</span>
                  )}
                  {proximoPartido.jornada && (
                    <span className="text-white/50 text-xs">J{proximoPartido.jornada}</span>
                  )}
                </>
              ) : (
                !ligaPosition && <span className="text-white/60">Sin partidos programados</span>
              )}
            </div>
          </div>
        </div>

        {/* Derecha: disponibilidad strip */}
        {plantilla && !loading && (
          <button
            onClick={onShowDisponibilidad}
            className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white text-sm"
          >
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <strong>{plantilla.disponibles}</strong> disponibles
            </span>
            <span className="text-white/40">|</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <strong>{plantilla.lesionados}</strong> lesionados
            </span>
            {plantilla.en_recuperacion > 0 && (
              <>
                <span className="text-white/40">|</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  <strong>{plantilla.en_recuperacion}</strong> recuperacion
                </span>
              </>
            )}
            <span className="text-white/40">|</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <strong>{plantilla.sancionados}</strong> sancionados
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
