import { api } from './client'
import { Suscripcion, Plan, UsageLimits, TrialStatus } from '@/types'

export const suscripcionesApi = {
  getCurrent: () =>
    api.get<Suscripcion>('/suscripciones/actual'),

  getPlans: () =>
    api.get<Plan[]>('/suscripciones/planes'),

  getUsage: () =>
    api.get<UsageLimits>('/suscripciones/uso'),

  getTrialStatus: () =>
    api.get<TrialStatus>('/suscripciones/trial-status'),

  createCheckout: (planCodigo: string, ciclo: 'mensual' | 'anual') =>
    api.post<{ checkout_url: string }>('/suscripciones/checkout', { plan_codigo: planCodigo, ciclo }),

  createPortal: () =>
    api.post<{ portal_url: string }>('/suscripciones/portal'),

  cancel: (motivo?: string) =>
    api.post<{ success: boolean }>('/suscripciones/cancelar', { motivo }),
}
