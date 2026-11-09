'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const KEY = 'kabine-appearance:v1'

function readClassic() {
  if (typeof document === 'undefined') return false
  return document.documentElement.getAttribute('data-appearance') === 'clasico'
}

export function AppearanceToggle({ collapsed = false }: { collapsed?: boolean }) {
  const [classic, setClassic] = useState(false)

  useEffect(() => {
    setClassic(readClassic())
  }, [])

  function toggle() {
    const next = !readClassic()
    if (next) document.documentElement.setAttribute('data-appearance', 'clasico')
    else document.documentElement.removeAttribute('data-appearance')
    try {
      localStorage.setItem(KEY, next ? 'clasico' : 'acta')
    } catch {
      // Private mode can refuse storage. The choice still applies this visit.
    }
    setClassic(next)
  }

  const label = classic ? 'Aspecto nuevo' : 'Aspecto anterior'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={classic}
      title={label}
      className={cn(
        'kabine-nav w-full text-left text-sm',
        collapsed ? 'flex justify-center px-2 py-2.5' : 'px-3 py-2'
      )}
    >
      {collapsed ? 'Aa' : label}
    </button>
  )
}
