'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { InformeDocumento, type DocMeta, type PageSpec } from './primitives'

const PAGE_PX = (210 / 25.4) * 96

interface DocProps {
  meta: DocMeta
  pages: PageSpec[]
  accent: string
  highlight: string
}

/** Live preview: real A4 pages scaled to the available width. */
export function InformeLienzo(props: DocProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.6)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const w = el.clientWidth - 32
      setScale(Math.max(0.3, Math.min(1.1, w / PAGE_PX)))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={ref} data-paleta-propia className="w-full py-4">
      <div style={{ zoom: scale }}>
        <InformeDocumento {...props} />
      </div>
    </div>
  )
}

async function esperarRecursos(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll('img'))
  await Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true })
            img.addEventListener('error', () => resolve(), { once: true })
          })
    )
  )
  if (document.fonts?.ready) await document.fonts.ready
}

/** Mounts the document at real size outside the app shell and opens the browser's print dialog. */
export function InformeImpresion({ fileName, onDone, ...props }: DocProps & { fileName: string; onDone: () => void }) {
  const [host, setHost] = useState<HTMLElement | null>(null)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    const el = document.createElement('div')
    el.id = 'informe-print-root'
    el.setAttribute('data-paleta-propia', '')
    document.body.appendChild(el)
    setHost(el)
    return () => {
      el.remove()
    }
  }, [])

  useEffect(() => {
    if (!host) return
    let cancelled = false
    const html = document.documentElement
    const prevTitle = document.title
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      html.classList.remove('informe-printing')
      document.title = prevTitle
      if (!cancelled) doneRef.current()
    }
    const run = async () => {
      await esperarRecursos(host)
      if (cancelled) return
      html.classList.add('informe-printing')
      document.title = fileName
      window.addEventListener('afterprint', finish, { once: true })
      window.print()
      // Safari and some mobile browsers never fire afterprint
      window.setTimeout(() => {
        window.removeEventListener('afterprint', finish)
        finish()
      }, 1500)
    }
    const t = window.setTimeout(run, 60)
    return () => {
      cancelled = true
      window.clearTimeout(t)
      window.removeEventListener('afterprint', finish)
      html.classList.remove('informe-printing')
      document.title = prevTitle
    }
  }, [host, fileName])

  if (!host) return null
  return createPortal(
    <>
      <style>{'@page { size: A4; margin: 0; }'}</style>
      <InformeDocumento {...props} />
    </>,
    host
  )
}
