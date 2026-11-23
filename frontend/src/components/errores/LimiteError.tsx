'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import * as Sentry from '@sentry/nextjs'
import { AlertTriangle, RotateCw } from 'lucide-react'

type Props = {
  /** Nombre de la zona para el aviso y Sentry ("calendario", "cabecera"…). */
  zona: string
  children: ReactNode
  /** Si cambia alguno, se vuelve a intentar pintar (p. ej. equipo activo). */
  resetKeys?: readonly unknown[]
  /** Altura mínima del hueco, para que la página no salte. */
  className?: string
  /** Sin aviso visible (zonas decorativas como la barra de semana). */
  silencioso?: boolean
}

type State = { error: Error | null; intentos: number }

/**
 * Límite de error local: si una zona del dashboard falla al pintar, solo esa
 * zona muestra un aviso con "Reintentar"; el resto de la página sigue viva.
 * El primer fallo se reintenta solo (suele ser un dato a medio llegar).
 */
export class LimiteError extends Component<Props, State> {
  state: State = { error: null, intentos: 0 }
  private timer: ReturnType<typeof setTimeout> | null = null

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    try {
      Sentry.captureException(error, { tags: { zona: this.props.zona }, extra: { componentStack: info.componentStack } })
    } catch {
      // ignorar
    }
    if (this.state.intentos === 0) {
      this.timer = setTimeout(() => this.reintentar(), 1_500)
    }
  }

  componentDidUpdate(prev: Props) {
    if (!this.state.error) return
    const a = prev.resetKeys ?? []
    const b = this.props.resetKeys ?? []
    if (a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]))) {
      this.setState({ error: null, intentos: 0 })
    }
  }

  componentWillUnmount() {
    if (this.timer) clearTimeout(this.timer)
  }

  reintentar = () => {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    this.setState((s) => ({ error: null, intentos: s.intentos + 1 }))
  }

  render() {
    if (!this.state.error) return this.props.children
    if (this.props.silencioso) return null
    return (
      <div
        role="alert"
        className={`flex items-center justify-center gap-3 rounded-[var(--radius)] border border-dashed border-border bg-card px-4 py-6 text-sm text-muted-foreground ${this.props.className ?? ''}`}
      >
        <AlertTriangle aria-hidden className="h-4 w-4 flex-none" />
        <span>No se pudo mostrar {this.props.zona}.</span>
        <button
          type="button"
          onClick={this.reintentar}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        >
          <RotateCw aria-hidden className="h-3.5 w-3.5" />
          Reintentar
        </button>
      </div>
    )
  }
}
