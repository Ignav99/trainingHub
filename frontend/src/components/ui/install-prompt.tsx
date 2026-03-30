'use client'

import { useState, useEffect } from 'react'
import { Download, X, Share } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSHint, setShowIOSHint] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    // Don't show if already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return

    // Check visit count and previous dismissal
    const visits = parseInt(localStorage.getItem('kabine-visits') || '0', 10) + 1
    localStorage.setItem('kabine-visits', String(visits))
    if (visits < 3) return
    if (localStorage.getItem('kabine-install-dismissed')) return

    // Detect iOS Safari
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream
    const isSafari = /safari/i.test(navigator.userAgent) && !/chrome|crios|fxios/i.test(navigator.userAgent)
    if (isIOS && isSafari) {
      setShowIOSHint(true)
      setDismissed(false)
      return
    }

    // Chrome/Android beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setDismissed(false)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDismissed(true)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('kabine-install-dismissed', '1')
  }

  if (dismissed || (!deferredPrompt && !showIOSHint)) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 lg:hidden animate-fade-in">
      <div className="bg-card border shadow-lg rounded-xl p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          {showIOSHint ? <Share className="h-5 w-5 text-primary" /> : <Download className="h-5 w-5 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Instalar Kabin-e</p>
          {showIOSHint ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              Pulsa <Share className="inline h-3 w-3" /> y luego &quot;Añadir a pantalla de inicio&quot;
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">
              Accede más rápido desde tu escritorio
            </p>
          )}
          {deferredPrompt && (
            <Button size="sm" className="mt-2 h-8 text-xs" onClick={handleInstall}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Instalar
            </Button>
          )}
        </div>
        <button onClick={handleDismiss} className="p-1 rounded-md hover:bg-muted shrink-0">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}
