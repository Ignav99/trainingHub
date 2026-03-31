export const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })

export const formatRole = (r: string) =>
  r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

export const estadoBadge = (estado: string) => {
  const colors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800',
    trial: 'bg-blue-100 text-blue-800',
    suspended: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-600',
    past_due: 'bg-amber-100 text-amber-800',
    grace_period: 'bg-orange-100 text-orange-800',
  }
  return colors[estado] || 'bg-gray-100 text-gray-600'
}
