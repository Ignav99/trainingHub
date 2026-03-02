import { supabase } from '@/lib/supabase/client'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1'

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
}

// Helper to get token from localStorage (zustand persist)
function getPersistedToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem('traininghub-auth')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed?.state?.accessToken || null
    }
  } catch {
    // Ignore parse errors
  }
  return null
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    // Always get fresh token from Supabase (handles refresh automatically)
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token || getPersistedToken()

    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${this.baseUrl}${path}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, String(value))
        }
      })
    }
    return url.toString()
  }

  async get<T>(path: string, options?: FetchOptions): Promise<T> {
    const url = this.buildUrl(path, options?.params)
    const authHeaders = await this.getAuthHeaders()
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      if (response.status === 401) {
        throw new Error('Error de autenticación: ' + (error.detail || 'Sesión expirada'))
      }
      throw new Error(error.detail || `API Error: ${response.status}`)
    }

    return response.json()
  }

  async post<T>(path: string, data?: unknown, options?: FetchOptions): Promise<T> {
    const url = this.buildUrl(path, options?.params)
    const authHeaders = await this.getAuthHeaders()
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      if (response.status === 401) {
        throw new Error('Error de autenticación: ' + (error.detail || 'Sesión expirada'))
      }
      throw new Error(error.detail || `API Error: ${response.status}`)
    }

    return response.json()
  }

  async put<T>(path: string, data?: unknown, options?: FetchOptions): Promise<T> {
    const url = this.buildUrl(path, options?.params)
    const authHeaders = await this.getAuthHeaders()
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      if (response.status === 401) {
        throw new Error('Error de autenticación: ' + (error.detail || 'Sesión expirada'))
      }
      throw new Error(error.detail || `API Error: ${response.status}`)
    }

    return response.json()
  }

  async patch<T>(path: string, data?: unknown, options?: FetchOptions): Promise<T> {
    const url = this.buildUrl(path, options?.params)
    const authHeaders = await this.getAuthHeaders()
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      if (response.status === 401) {
        throw new Error('Error de autenticación: ' + (error.detail || 'Sesión expirada'))
      }
      throw new Error(error.detail || `API Error: ${response.status}`)
    }

    return response.json()
  }

  async upload<T>(path: string, formData: FormData, options?: FetchOptions): Promise<T> {
    const url = this.buildUrl(path, options?.params)
    const authHeaders = await this.getAuthHeaders()
    // Don't set Content-Type for FormData - browser sets it with boundary
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...authHeaders,
        ...options?.headers,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      if (response.status === 401) {
        throw new Error('Error de autenticación: ' + (error.detail || 'Sesión expirada'))
      }
      throw new Error(error.detail || `API Error: ${response.status}`)
    }

    return response.json()
  }

  async getBlob(path: string, options?: FetchOptions): Promise<Blob> {
    const url = this.buildUrl(path, options?.params)
    const authHeaders = await this.getAuthHeaders()
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...authHeaders,
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `API Error: ${response.status}`)
    }

    return response.blob()
  }

  async delete(path: string, options?: FetchOptions): Promise<void> {
    const url = this.buildUrl(path, options?.params)
    const authHeaders = await this.getAuthHeaders()
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      if (response.status === 401) {
        throw new Error('Error de autenticación: ' + (error.detail || 'Sesión expirada'))
      }
      throw new Error(error.detail || `API Error: ${response.status}`)
    }
  }
}

export const api = new ApiClient(API_URL)
