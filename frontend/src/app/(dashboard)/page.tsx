'use client'

import Link from 'next/link'
import { 
  Plus, 
  ClipboardList, 
  Calendar, 
  TrendingUp,
  Clock,
  Users
} from 'lucide-react'

// Datos de ejemplo (luego vendrán de la API)
const proximasSesiones = [
  { id: 1, titulo: 'Sesión MD-3', fecha: '05/12/2024', matchDay: 'MD-3', objetivo: 'Salida de balón' },
  { id: 2, titulo: 'Sesión MD-2', fecha: '06/12/2024', matchDay: 'MD-2', objetivo: 'Finalización' },
  { id: 3, titulo: 'Sesión MD-1', fecha: '07/12/2024', matchDay: 'MD-1', objetivo: 'Activación + ABP' },
]

const stats = [
  { name: 'Tareas en biblioteca', value: '47', icon: ClipboardList, color: 'text-blue-600 bg-blue-100' },
  { name: 'Sesiones este mes', value: '12', icon: Calendar, color: 'text-green-600 bg-green-100' },
  { name: 'Categoría más usada', value: 'JdP', icon: TrendingUp, color: 'text-purple-600 bg-purple-100' },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Bienvenido de vuelta. Aquí tienes un resumen.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/tareas/nueva"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nueva Tarea
          </Link>
          <Link
            href="/sesiones/nueva"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nueva Sesión
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-xl border border-gray-200 p-5"
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.name}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Próximas sesiones */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Próximas Sesiones</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {proximasSesiones.map((sesion) => (
              <div key={sesion.id} className="px-5 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <span className={`
                        inline-flex items-center px-2.5 py-1 rounded text-xs font-bold
                        ${sesion.matchDay === 'MD-3' ? 'bg-orange-100 text-orange-800' : ''}
                        ${sesion.matchDay === 'MD-2' ? 'bg-blue-100 text-blue-800' : ''}
                        ${sesion.matchDay === 'MD-1' ? 'bg-purple-100 text-purple-800' : ''}
                      `}>
                        {sesion.matchDay}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{sesion.titulo}</p>
                      <p className="text-sm text-gray-500">{sesion.objetivo}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      {sesion.fecha}
                    </div>
                    <Link
                      href={`/sesiones/${sesion.id}`}
                      className="text-sm font-medium text-primary hover:text-primary/80"
                    >
                      Ver
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 border-t border-gray-200">
            <Link
              href="/sesiones"
              className="text-sm font-medium text-primary hover:text-primary/80"
            >
              Ver todas las sesiones →
            </Link>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Acciones Rápidas</h2>
          </div>
          <div className="p-5 space-y-3">
            <Link
              href="/sesiones/nueva?mode=assisted"
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Crear Sesión Asistida</p>
                <p className="text-xs text-gray-500">Con recomendaciones IA</p>
              </div>
            </Link>
            
            <Link
              href="/biblioteca"
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 bg-blue-100 rounded-lg">
                <ClipboardList className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Explorar Biblioteca</p>
                <p className="text-xs text-gray-500">47 tareas disponibles</p>
              </div>
            </Link>
            
            <Link
              href="/configuracion/equipo"
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Gestionar Equipo</p>
                <p className="text-xs text-gray-500">22 jugadores</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
