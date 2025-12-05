import { useAuthStore } from '@/stores/authStore'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1'

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private getAuthHeaders(): HeadersInit {
    const token = useAuthStore.getState().accessToken
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
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }

    return response.json()
  }

  async post<T>(path: string, data?: unknown, options?: FetchOptions): Promise<T> {
    const url = this.buildUrl(path, options?.params)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `API Error: ${response.status}`)
    }

    return response.json()
  }

  async put<T>(path: string, data?: unknown, options?: FetchOptions): Promise<T> {
    const url = this.buildUrl(path, options?.params)
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `API Error: ${response.status}`)
    }

    return response.json()
  }

  async patch<T>(path: string, data?: unknown, options?: FetchOptions): Promise<T> {
    const url = this.buildUrl(path, options?.params)
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `API Error: ${response.status}`)
    }

    return response.json()
  }

  async delete(path: string, options?: FetchOptions): Promise<void> {
    const url = this.buildUrl(path, options?.params)
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `API Error: ${response.status}`)
    }
  }
}

export const api = new ApiClient(API_URL)
