'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useClubStore, hexToHsl } from '@/stores/clubStore'
import { useEquipoStore } from '@/stores/equipoStore'
import { Button } from '@/components/ui/button'
import { Stepper } from '@/components/ui/stepper'
import { ClubIdentityStep } from './steps/ClubIdentityStep'
import { TeamSetupStep } from './steps/TeamSetupStep'
import { PlayersStep } from './steps/PlayersStep'
import { PreferencesStep } from './steps/PreferencesStep'

const STEPS = [
  { title: 'Tu club', description: 'Identidad y colores' },
  { title: 'Equipo', description: 'Datos del equipo' },
  { title: 'Plantilla', description: 'Añade jugadores' },
  { title: 'Preferencias', description: 'Últimos ajustes' },
]

export interface ClubData {
  nombre: string
  colorPrimario: string
  colorSecundario: string
  logoFile: File | null
  logoPreview: string | null
}

export interface TeamData {
  nombre: string
  categoria: string
  temporada: string
  sistemaJuego: string
}

export interface PlayerData {
  nombre: string
  apellidos: string
  dorsal: number | null
  posicionPrincipal: string
  piernaDominante: string
}

export interface PreferencesData {
  idioma: string
  notificaciones: boolean
  aiEnabled: boolean
}

export default function OnboardingPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const { updateTheme, setOnboardingComplete } = useClubStore()
  const { loadEquipos } = useEquipoStore()

  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Step data
  const [clubData, setClubData] = useState<ClubData>({
    nombre: user?.organizacion?.nombre || '',
    colorPrimario: '#1e3a5f',
    colorSecundario: '#f0f4f8',
    logoFile: null,
    logoPreview: null,
  })

  const [teamData, setTeamData] = useState<TeamData>({
    nombre: '',
    categoria: '',
    temporada: '2025/2026',
    sistemaJuego: '4-3-3',
  })

  const [players, setPlayers] = useState<PlayerData[]>([])

  const [preferences, setPreferences] = useState<PreferencesData>({
    idioma: 'es',
    notificaciones: true,
    aiEnabled: true,
  })

  const canProceed = useCallback((): boolean => {
    switch (currentStep) {
      case 0:
        return clubData.nombre.trim().length >= 2 && clubData.colorPrimario.length === 7
      case 1:
        return teamData.nombre.trim().length >= 2 && teamData.categoria.length > 0
      case 2:
        return true // Players are optional
      case 3:
        return true
      default:
        return false
    }
  }, [currentStep, clubData, teamData])

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setIsSubmitting(true)

    try {
      // 1. Update organization (colors, name, logo)
      const { organizacionApi } = await import('@/lib/api/organizacion')

      // Upload logo if provided
      let logoUrl: string | null = null
      if (clubData.logoFile) {
        try {
          const result = await organizacionApi.uploadLogo(clubData.logoFile)
          logoUrl = result.logo_url
        } catch (e) {
          console.warn('Logo upload failed, continuing without logo:', e)
        }
      }

      await organizacionApi.update({
        nombre: clubData.nombre,
        color_primario: clubData.colorPrimario,
        color_secundario: clubData.colorSecundario,
        config: { onboarding_complete: true },
      })

      // 2. Create team
      const { equiposApi } = await import('@/lib/api/equipos')
      const team = await equiposApi.create({
        nombre: teamData.nombre,
        categoria: teamData.categoria,
        temporada: teamData.temporada,
        sistema_juego: teamData.sistemaJuego,
      })

      // 3. Add players if any
      if (players.length > 0 && team?.id) {
        const { jugadoresApi } = await import('@/lib/api/jugadores')
        for (const player of players) {
          try {
            await jugadoresApi.create({
              equipo_id: team.id,
              nombre: player.nombre,
              apellidos: player.apellidos,
              dorsal: player.dorsal ?? undefined,
              posicion_principal: player.posicionPrincipal,
              pierna_dominante: (player.piernaDominante || 'derecha') as 'derecha' | 'izquierda' | 'ambas',
            })
          } catch (e) {
            console.warn('Failed to create player:', player.nombre, e)
          }
        }
      }

      // 4. Update local state
      updateTheme({
        colorPrimario: clubData.colorPrimario,
        colorSecundario: clubData.colorSecundario,
        logoUrl,
      })
      setOnboardingComplete(true)

      // 5. Reload teams
      await loadEquipos()

      // 6. Navigate to dashboard
      router.push('/')
    } catch (error) {
      console.error('Onboarding error:', error)
      alert('Hubo un error al guardar la configuración. Inténtalo de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-md"
              style={{ backgroundColor: clubData.colorPrimario }}
            >
              {clubData.logoPreview ? (
                <img src={clubData.logoPreview} alt="" className="w-8 h-8 object-contain" />
              ) : (
                <Shield className="h-5 w-5" />
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold">
                {clubData.nombre || 'Configuración inicial'}
              </h1>
              <p className="text-xs text-muted-foreground">
                Paso {currentStep + 1} de {STEPS.length}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Stepper */}
      <div className="max-w-4xl mx-auto w-full px-4 pt-8 pb-4">
        <Stepper steps={STEPS} currentStep={currentStep} />
      </div>

      {/* Step content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <div className="bg-card rounded-xl border shadow-sm p-6 sm:p-8">
          {currentStep === 0 && (
            <ClubIdentityStep data={clubData} onChange={setClubData} />
          )}
          {currentStep === 1 && (
            <TeamSetupStep data={teamData} onChange={setTeamData} />
          )}
          {currentStep === 2 && (
            <PlayersStep players={players} onChange={setPlayers} />
          )}
          {currentStep === 3 && (
            <PreferencesStep
              data={preferences}
              onChange={setPreferences}
              clubData={clubData}
              teamData={teamData}
              playersCount={players.length}
            />
          )}
        </div>
      </div>

      {/* Footer navigation */}
      <footer className="border-t bg-card/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Siguiente
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={isSubmitting}
              className="min-w-[180px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Completar configuración
                </>
              )}
            </Button>
          )}
        </div>
      </footer>
    </div>
  )
}
