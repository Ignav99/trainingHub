'use client'

import { Film, Play, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface WarRoomVideosProps {
  microcicloId: string
  planPartido?: { id: string } | null
}

export function WarRoomVideos({ microcicloId, planPartido }: WarRoomVideosProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Film className="h-4 w-4 text-indigo-600" />
          Videos
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 pt-0">
        {/* Rival videos */}
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-[11px] font-semibold text-amber-800 mb-2">🎥 Rival</p>
          <div className="space-y-1.5">
            <Button variant="ghost" size="sm" className="text-[10px] h-6 px-1.5 w-full justify-start" asChild>
              <Link href="/video-analisis">
                <Play className="h-3 w-3 mr-1" /> Último partido
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="text-[10px] h-6 px-1.5 w-full justify-start" asChild>
              <Link href="/video-analisis?filter=abp">
                <Play className="h-3 w-3 mr-1" /> Jugadas ABP
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="text-[10px] h-6 px-1.5 w-full justify-start" asChild>
              <Link href="/video-analisis?filter=goles">
                <Play className="h-3 w-3 mr-1" /> Goles encajados
              </Link>
            </Button>
          </div>
        </div>

        {/* Modelo propio */}
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-[11px] font-semibold text-blue-800 mb-2">🎬 Mi modelo</p>
          <div className="space-y-1.5">
            <Button variant="ghost" size="sm" className="text-[10px] h-6 px-1.5 w-full justify-start" asChild>
              <Link href="/modelo-juego">
                <Play className="h-3 w-3 mr-1" /> Presión alta
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="text-[10px] h-6 px-1.5 w-full justify-start" asChild>
              <Link href="/modelo-juego?fase=salida">
                <Play className="h-3 w-3 mr-1" /> Salida 3-2
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="text-[10px] h-6 px-1.5 w-full justify-start" asChild>
              <Link href="/modelo-juego?fase=transiciones">
                <Play className="h-3 w-3 mr-1" /> Transiciones
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
