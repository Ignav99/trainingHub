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
    // First try to get from persisted zustand state (faster)
    let token = getPersistedToken()

    // Fallback to Supabase session if not in store
    if (!token) {
      const { data: { session } } = await supabase.auth.getSession()
      token = session?.access_token || null
    }

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
