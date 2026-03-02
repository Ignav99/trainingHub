import { api } from './client'
import { ConsentimientoGDPR, SolicitudGDPR } from '@/types'

export const gdprApi = {
  // Consentimientos
  getConsentimientos: () =>
    api.get<ConsentimientoGDPR[]>('/gdpr/consentimientos'),

  otorgarConsentimiento: (tipo: string, version: string) =>
    api.post<ConsentimientoGDPR>('/gdpr/consentimientos', { tipo, version, otorgado: true }),

  revocarConsentimiento: (tipo: string) =>
    api.post<ConsentimientoGDPR>(`/gdpr/consentimientos/${tipo}/revocar`),

  // Solicitudes GDPR
  getSolicitudes: () =>
    api.get<SolicitudGDPR[]>('/gdpr/solicitudes'),

  createSolicitud: (tipo: string, descripcion?: string) =>
    api.post<SolicitudGDPR>('/gdpr/solicitudes', { tipo, descripcion }),

  // Data export
  exportData: () =>
    api.post<{ download_url: string; expires_at: string }>('/gdpr/export'),

  // Delete account
  deleteAccount: (confirmacion: string) =>
    api.post<{ success: boolean }>('/gdpr/eliminar-cuenta', { confirmacion }),
}
