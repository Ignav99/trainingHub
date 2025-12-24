'use client'

import Link from 'next/link'
import {
  Users,
  FileText,
  Video,
  TrendingUp,
  ChevronRight,
  Shield,
  Target,
  BarChart3
} from 'lucide-react'

const sections = [
  {
    id: 'rivales',
    title: 'Rivales de Liga',
    description: 'Gestiona los equipos de tu liga, añade escudos y notas de análisis',
    icon: Users,
    href: '/analisis/rivales',
    color: 'bg-blue-500',
    stats: 'Equipos registrados'
  },
  {
    id: 'informes',
    title: 'Informes de Partido',
    description: 'Crea y consulta informes pre-partido y post-partido',
    icon: FileText,
    href: '/analisis/informes',
    color: 'bg-green-500',
    stats: 'Informes creados',
    comingSoon: true
  },
  {
    id: 'videos',
    title: 'Análisis de Vídeo',
    description: 'Sube y organiza vídeos de rivales y de tu propio equipo',
    icon: Video,
    href: '/analisis/videos',
    color: 'bg-purple-500',
    stats: 'Vídeos subidos',
    comingSoon: true
  },
  {
    id: 'estadisticas',
    title: 'Estadísticas',
    description: 'Consulta estadísticas de partidos jugados y rendimiento',
    icon: BarChart3,
    href: '/analisis/estadisticas',
    color: 'bg-amber-500',
    stats: 'Partidos analizados',
    comingSoon: true
  }
]

export default function AnalisisPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Target className="h-7 w-7 text-primary" />
          Análisis
        </h1>
        <p className="text-gray-500 mt-1">
          Gestiona rivales, informes, vídeos y estadísticas de tu equipo
        </p>
      </div>

      {/* Secciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => (
          <Link
            key={section.id}
            href={section.comingSoon ? '#' : section.href}
            className={`bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all group ${
              section.comingSoon ? 'opacity-60 cursor-not-allowed' : 'hover:border-primary/30'
            }`}
            onClick={(e) => section.comingSoon && e.preventDefault()}
          >
            <div className="flex items-start gap-4">
              <div className={`${section.color} p-3 rounded-xl text-white`}>
                <section.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                    {section.title}
                  </h3>
                  {section.comingSoon && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      Próximamente
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {section.description}
                </p>
              </div>
              <ChevronRight className={`h-5 w-5 text-gray-400 group-hover:text-primary transition-colors ${
                section.comingSoon ? '' : 'group-hover:translate-x-1'
              } transition-transform`} />
            </div>
          </Link>
        ))}
      </div>

      {/* Tips */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-6 border border-primary/20">
        <div className="flex items-start gap-4">
          <div className="bg-primary/20 p-2 rounded-lg">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Configura tu liga</h3>
            <p className="text-sm text-gray-600 mt-1">
              Empieza añadiendo todos los equipos de tu liga en la sección de <strong>Rivales</strong>.
              Así podrás programar partidos fácilmente y tener toda la información de análisis organizada.
            </p>
            <Link
              href="/analisis/rivales"
              className="inline-flex items-center gap-1 text-sm text-primary font-medium mt-3 hover:underline"
            >
              Ir a Rivales
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
