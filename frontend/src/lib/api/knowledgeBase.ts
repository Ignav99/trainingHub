import { api } from './client'
import { DocumentoKB, KBSearchResult } from '@/types'

export interface CreateDocumentoKBData {
  titulo: string
  tipo: 'manual' | 'pdf' | 'url'
  contenido_texto?: string
  fuente?: string
  metadata?: Record<string, any>
}

export const knowledgeBaseApi = {
  list: (params?: { tipo?: string; estado?: string; page?: number; limit?: number }) =>
    api.get<{ data: DocumentoKB[]; total: number; page: number; limit: number; pages: number }>('/kb/documentos', { params }),

  get: (id: string) =>
    api.get<DocumentoKB>(`/kb/documentos/${id}`),

  create: (data: CreateDocumentoKBData) =>
    api.post<DocumentoKB>('/kb/documentos', data),

  uploadPdf: (file: File, titulo: string) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('titulo', titulo)
    return api.upload<DocumentoKB>('/kb/documentos/upload', formData)
  },

  delete: (id: string) =>
    api.delete(`/kb/documentos/${id}`),

  search: (query: string, limit?: number) =>
    api.post<{ resultados: KBSearchResult[]; query: string; total: number }>('/kb/buscar', {
      query,
      limit: limit || 10,
    }),

  reindex: (id: string) =>
    api.post(`/kb/documentos/${id}/indexar`),

  reindexAll: () =>
    api.post<{ message: string; total: number }>('/kb/reindexar-todo'),
}
