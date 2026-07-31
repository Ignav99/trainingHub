'use client'

import { useEffect, useState } from 'react'
import { Loader2, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { clubAdminApi, type ClubJugador } from '@/lib/api/clubAdmin'
import JugadorGridCard from '../../../components/JugadorGridCard'
import MassInvitePlayersDialog from './MassInvitePlayersDialog'

interface PlantillaTabProps {
  equipoId: string
}

export default function PlantillaTab({ equipoId }: PlantillaTabProps) {
  const [jugadores, setJugadores] = useState<ClubJugador[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)

  const load = () => {
    setLoading(true)
    // `limit: 200` is the backend's max page size (see /club/jugadores) —
    // fetching it directly avoids silently truncating rosters bigger than
    // the old default of 50 while a real "load more" UI isn't built yet.
    // The header count uses `res.total` (not jugadores.length) so it never
    // lies even if a roster somehow exceeds this page size.
    clubAdminApi
      .getClubJugadores({ equipo_id: equipoId, limit: 200 })
      .then((res) => { setJugadores(res.data); setTotal(res.total) })
      .catch((err: any) => toast.error(err.message || 'Error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [equipoId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{total} jugadores</span>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Invitar jugadores
        </button>
      </div>

      {jugadores.length === 0 ? (
        <div className="bg-white rounded-xl border p-10 text-center text-gray-400">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Este equipo aun no tiene jugadores</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {jugadores.map((j) => (
            <JugadorGridCard key={j.id} jugador={j} />
          ))}
        </div>
      )}

      <MassInvitePlayersDialog
        equipoId={equipoId}
        open={showInvite}
        onClose={() => { setShowInvite(false); load() }}
      />
    </div>
  )
}
