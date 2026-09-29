'use client'

import { Plus, X } from 'lucide-react'
import { useTacticalBoardStore } from '@/stores/useTacticalBoardStore'
import { dorsalesEnCampo, toggleDorsal, type ABPRolCampo } from '@/lib/abpCampoRoles'

function newRole(): ABPRolCampo {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `rol-${Date.now()}`
  return { id, dorsales: [], texto: '' }
}

export default function ABPCampoRolesPanel() {
  const elements = useTacticalBoardStore((s) => s.elements)
  const roles = useTacticalBoardStore((s) => s.campoRoles)
  const setCampoRoles = useTacticalBoardStore((s) => s.setCampoRoles)
  const onPitch = dorsalesEnCampo(elements)

  const update = (id: string, patch: Partial<ABPRolCampo>) => {
    setCampoRoles(roles.map((rol) => (rol.id === id ? { ...rol, ...patch } : rol)))
  }

  return (
    <aside className="flex max-h-[42%] min-h-0 w-full shrink-0 flex-col border-t bg-white md:max-h-none md:min-w-[22rem] md:flex-1 md:border-l md:border-t-0">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <p className="text-xs font-semibold text-gray-700">Roles del campo</p>
        <button
          type="button"
          onClick={() => setCampoRoles([...roles, newRole()])}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Crear rol
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-auto p-2">
        {roles.length === 0 ? (
          <p className="px-1 py-2 text-[11px] leading-snug text-gray-500">
            Crea un rol y marca los dorsales que están en el campo. El texto sale debajo del campograma en el PDF.
          </p>
        ) : null}
        {roles.map((rol) => {
          const chips = Array.from(new Set([...onPitch, ...rol.dorsales]))
          return (
            <div key={rol.id} className="flex items-stretch gap-2 rounded-md border border-gray-200 p-2">
              <div className="flex w-[7.5rem] shrink-0 flex-wrap content-start gap-1 sm:w-36">
                {chips.length === 0 ? (
                  <span className="text-[11px] text-gray-400">Pon dorsales en el campo</span>
                ) : (
                  chips.map((dorsal) => {
                    const on = rol.dorsales.includes(dorsal)
                    const missing = !onPitch.includes(dorsal)
                    return (
                      <button
                        key={dorsal}
                        type="button"
                        onClick={() => update(rol.id, { dorsales: toggleDorsal(rol.dorsales, dorsal) })}
                        className={`h-7 min-w-7 rounded-full border px-1.5 text-xs font-semibold tabular-nums ${
                          on
                            ? 'border-gray-900 bg-gray-900 text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        } ${missing ? 'opacity-50' : ''}`}
                        title={missing ? 'Este dorsal ya no está en el campo' : `Dorsal ${dorsal}`}
                      >
                        {dorsal}
                      </button>
                    )
                  })
                )}
              </div>
              <textarea
                value={rol.texto}
                onChange={(e) => update(rol.id, { texto: e.target.value })}
                placeholder="Qué hace en la jugada"
                rows={4}
                className="min-h-24 w-full flex-1 resize-y rounded-md border border-gray-300 px-2 py-1.5 text-sm leading-snug"
              />
              <button
                type="button"
                onClick={() => setCampoRoles(roles.filter((item) => item.id !== rol.id))}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                title="Quitar rol"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
