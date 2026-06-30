'use client'

import { useState, useRef, lazy, Suspense } from 'react'
import { SAMPLE_VIDEOS, MOCK_PLAYERS } from '@/lib/mock/mock-data'

// Lazy-load same as production page
const VideoAnalyzer = lazy(() =>
  import('@/components/video-analyzer/VideoAnalyzer').then((m) => ({ default: m.VideoAnalyzer }))
)

// Mock IDs — VideoAnalyzer requires non-empty strings for partidoId and equipoId.
// API calls (jugadoresApi.list, fetchCategories, fetchTags) will fail silently
// because the component already has .catch(() => {}) on all of them.
const MOCK_PARTIDO_ID = 'local-partido-1'
const MOCK_EQUIPO_ID = 'local-equipo-1'

export default function LocalVideoPage() {
  const [activeFile, setActiveFile] = useState<File | null>(null)
  const [activeUrl, setActiveUrl] = useState<string | null>(null)
  const [activeTitle, setActiveTitle] = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)

  const isAnalyzerOpen = activeFile !== null || activeUrl !== null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setActiveFile(f)
    setActiveUrl(null)
    setActiveTitle(f.name)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSampleVideo = (url: string, label: string) => {
    setActiveUrl(url)
    setActiveFile(null)
    setActiveTitle(label)
  }

  const handleClose = () => {
    setActiveFile(null)
    setActiveUrl(null)
    setActiveTitle('')
  }

  if (isAnalyzerOpen) {
    return (
      <Suspense fallback={<div className="fixed inset-0 bg-black flex items-center justify-center text-white text-sm">Cargando analizador...</div>}>
        <VideoAnalyzer
          localFile={activeFile ?? undefined}
          videoUrl={activeUrl ?? undefined}
          videoTitle={activeTitle}
          partidoId={MOCK_PARTIDO_ID}
          equipoId={MOCK_EQUIPO_ID}
          onClose={handleClose}
        />
      </Suspense>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-1">VideoAnalyzer — Dev Local</h1>
        <p className="text-white/50 text-sm">Sin login, sin Supabase, sin backend</p>
      </div>

      {/* File picker */}
      <div className="w-full max-w-md">
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full py-3 px-4 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium"
        >
          Elegir archivo de video local
        </button>
      </div>

      {/* Sample videos */}
      <div className="w-full max-w-md">
        <p className="text-white/40 text-xs uppercase tracking-wider mb-3 text-center">
          o usar video de prueba
        </p>
        <div className="grid gap-2">
          {SAMPLE_VIDEOS.map((v) => (
            <button
              key={v.url}
              onClick={() => handleSampleVideo(v.url, v.label)}
              className="w-full py-2.5 px-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-sm text-left"
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Info box */}
      <div className="w-full max-w-md rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-4 text-xs text-yellow-200/80 space-y-1">
        <p className="font-semibold text-yellow-400">Entorno de desarrollo local</p>
        <p>Las funciones de tagging y anotaciones requieren backend — fallarán silenciosamente.</p>
        <p>Dibujo, clips, freeze frames y timeline funcionan completamente offline.</p>
        <p className="font-mono text-yellow-400/60">partidoId: {MOCK_PARTIDO_ID} · equipoId: {MOCK_EQUIPO_ID}</p>
      </div>
    </div>
  )
}
