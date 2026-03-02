import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(new Date(date))
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function getInitials(name: string, apellidos?: string): string {
  const first = name.charAt(0).toUpperCase()
  if (apellidos) {
    return first + apellidos.charAt(0).toUpperCase()
  }
  const parts = name.split(' ')
  if (parts.length > 1) {
    return first + parts[1].charAt(0).toUpperCase()
  }
  return first
}
