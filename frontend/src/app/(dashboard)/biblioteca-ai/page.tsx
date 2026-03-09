'use client'

import { useEffect, useState } from 'react'
import {
  BookOpen,
  Plus,
  Search,
  FileText,
  Globe,
  PenLine,
  Trash2,
  RefreshCw,
  Loader2,
  Bot,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { knowledgeBaseApi } from '@/lib/api/knowledgeBase'
import type { DocumentoKB } from '@/types'
import { formatDate } from '@/lib/utils'

type CreateMode = 'manual' | 'url' | 'pdf' | null

const STATUS_CONFIG: Record<string, { label: string; variant: any; icon: any }> = {
  pendiente: { label: 'Pendiente', variant: 'warning', icon: Clock },
  procesando: { label: 'Procesando', variant: 'info', icon: RefreshCw },
  indexado: { label: 'Indexado', variant: 'success', icon: CheckCircle2 },
  error: { label: 'Error', variant: 'destructive', icon: AlertCircle },
}

const TYPE_CONFIG: Record<string, { label: string; icon: any }> = {
  manual: { label: 'Texto manual', icon: PenLine },
  pdf: { label: 'PDF', icon: FileText },
  url: { label: 'URL', icon: Globe },
  seed: { label: 'Sistema', icon: Bot },
}

export default function BibliotecaAIPage() {
  const [documentos, setDocumentos] = useState<DocumentoKB[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[] | null>(null)
  const [searching, setSearching] = useState(false)

  // Create dialog
  const [createMode, setCreateMode] = useState<CreateMode>(null)
  const [creating, setCreating] = useState(false)
  const [newDoc, setNewDoc] = useState({ titulo: '', contenido_texto: '', fuente: '' })
  const [pdfFile, setPdfFile] = useState<File | null>(null)

  // Reindex all
  const [reindexingAll, setReindexingAll] = useState(false)

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchDocumentos = async () => {
    setLoading(true)
    try {
      const res = await knowledgeBaseApi.list()
      setDocumentos(res?.data || [])
    } catch (err) {
      console.error('Error fetching KB docs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocumentos()
  }, [])

  // Auto-refresh while any document is "pendiente" or "procesando"
  useEffect(() => {
    const hasPending = documentos.some((d) => d.estado === 'pendiente' || d.estado === 'procesando')
    if (!hasPending) return
    const interval = setInterval(fetchDocumentos, 3000)
    return () => clearInterval(interval)
  }, [documentos])

  const handleCreate = async () => {
    if (!newDoc.titulo.trim()) return
    setCreating(true)
    try {
      if (createMode === 'pdf' && pdfFile) {
        await knowledgeBaseApi.uploadPdf(pdfFile, newDoc.titulo)
      } else {
        await knowledgeBaseApi.create({
          titulo: newDoc.titulo,
          tipo: createMode === 'url' ? 'url' : 'manual',
          contenido_texto: createMode === 'manual' ? newDoc.contenido_texto : undefined,
          fuente: createMode === 'url' ? newDoc.fuente : undefined,
        })
      }
      setCreateMode(null)
      setNewDoc({ titulo: '', contenido_texto: '', fuente: '' })
      setPdfFile(null)
      fetchDocumentos()
    } catch (err: any) {
      toast.error(err.message || 'Error al crear documento')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await knowledgeBaseApi.delete(deleteId)
      setDeleteId(null)
      fetchDocumentos()
    } catch (err) {
      console.error('Error deleting doc:', err)
    } finally {
      setDeleting(false)
    }
  }

  const handleReindexAll = async () => {
    setReindexingAll(true)
    try {
      const res = await knowledgeBaseApi.reindexAll()
      if (res?.total === 0) {
        toast('No hay documentos para re-indexar')
      }
      fetchDocumentos()
    } catch (err: any) {
      toast.error(err.message || 'Error al re-indexar')
    } finally {
      setReindexingAll(false)
    }
  }

  const handleReindex = async (id: string) => {
    try {
      await knowledgeBaseApi.reindex(id)
      fetchDocumentos()
    } catch (err) {
      console.error('Error reindexing:', err)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null)
      return
    }
    setSearching(true)
    try {
      const res = await knowledgeBaseApi.search(searchQuery, 10)
      setSearchResults(res.resultados || [])
    } catch (err) {
      console.error('Error searching KB:', err)
    } finally {
      setSearching(false)
    }
  }

  const indexedCount = documentos.filter((d) => d.estado === 'indexado').length
  const totalChunks = documentos.reduce((sum, d) => sum + (d.num_chunks || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Base de Conocimiento AI
          </h1>
          <p className="text-muted-foreground mt-1">
            Sube documentos de metodologia, tacticas y teoria para que el asistente AI tome decisiones basadas en ellos.
          </p>
        </div>
        <div className="flex gap-2">
          {indexedCount > 0 && (
            <Button
              variant="outline"
              onClick={handleReindexAll}
              disabled={reindexingAll}
              title="Re-indexar todos los documentos con embeddings AI"
            >
              {reindexingAll ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Re-indexar todo
            </Button>
          )}
          <Button variant="outline" onClick={() => setCreateMode('url')}>
            <Globe className="h-4 w-4 mr-2" />
            URL
          </Button>
          <Button variant="outline" onClick={() => setCreateMode('manual')}>
            <PenLine className="h-4 w-4 mr-2" />
            Texto
          </Button>
          <Button onClick={() => setCreateMode('pdf')}>
            <Upload className="h-4 w-4 mr-2" />
            Subir PDF
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{documentos.length}</p>
              <p className="text-xs text-muted-foreground">Documentos totales</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{indexedCount}</p>
              <p className="text-xs text-muted-foreground">Documentos indexados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-50">
              <Bot className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{totalChunks}</p>
              <p className="text-xs text-muted-foreground">Fragmentos para la AI</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar en la base de conocimiento... (ej: periodizacion tactica, principios de juego)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
            </Button>
            {searchResults !== null && (
              <Button variant="ghost" onClick={() => { setSearchResults(null); setSearchQuery('') }}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Search results */}
          {searchResults !== null && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''} para "{searchQuery}"
              </p>
              {searchResults.map((result: any, i: number) => (
                <div key={i} className="p-3 rounded-lg border bg-muted/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px]">
                      {result.documento_titulo || 'Sin titulo'}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      Similitud: {Math.round((result.similitud || 0) * 100)}%
                    </span>
                  </div>
                  <p className="text-sm">{result.contenido || result.chunk?.contenido}</p>
                </div>
              ))}
              {searchResults.length === 0 && (
                <p className="text-sm text-center text-muted-foreground py-4">
                  No se encontraron resultados. Intenta con otros terminos.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
        <Bot className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-900">
            La AI usa estos documentos automaticamente
          </p>
          <p className="text-xs text-blue-700 mt-0.5">
            Cuando hablas con el asistente AI, este busca en tu base de conocimiento para fundamentar sus
            recomendaciones de sesiones, tacticas y metodologia. Sube PDFs de periodizacion tactica,
            manuales de entrenamiento, o cualquier documento de referencia.
          </p>
        </div>
      </div>

      {/* Document list */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Documentos</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : documentos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-medium mb-1">Sin documentos todavia</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Sube documentos de metodologia para que la AI pueda referenciarlos
              </p>
              <Button onClick={() => setCreateMode('manual')}>
                <Plus className="h-4 w-4 mr-2" />
                Crear primer documento
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {documentos.map((doc) => {
              const statusCfg = STATUS_CONFIG[doc.estado] || STATUS_CONFIG.pendiente
              const typeCfg = TYPE_CONFIG[doc.tipo] || TYPE_CONFIG.manual
              const StatusIcon = statusCfg.icon
              const TypeIcon = typeCfg.icon

              return (
                <Card key={doc.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-muted shrink-0">
                          <TypeIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-medium truncate">{doc.titulo}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant={statusCfg.variant as any} className="text-[10px] gap-1">
                              <StatusIcon className="h-3 w-3" />
                              {statusCfg.label}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {typeCfg.label}
                            </span>
                            {doc.num_chunks > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                {doc.num_chunks} fragmentos
                              </span>
                            )}
                            {doc.fuente && (
                              <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                                {doc.fuente}
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {formatDate(doc.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {(doc.estado === 'pendiente' || doc.estado === 'error') && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReindex(doc.id)}
                            title="Indexar"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(doc.id)}
                          className="text-muted-foreground hover:text-destructive"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createMode !== null} onOpenChange={(open) => !open && setCreateMode(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {createMode === 'pdf' ? 'Subir PDF' : createMode === 'url' ? 'Importar desde URL' : 'Nuevo documento'}
            </DialogTitle>
            <DialogDescription>
              {createMode === 'pdf'
                ? 'Sube un PDF de metodologia, tacticas o teoria. El texto se extraera y se indexara automaticamente.'
                : createMode === 'url'
                ? 'Introduce la URL de un articulo o documento web.'
                : 'Escribe o pega el contenido de tu documento de metodologia.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titulo *</Label>
              <Input
                placeholder="Ej: Periodizacion Tactica - Vitor Frade"
                value={newDoc.titulo}
                onChange={(e) => setNewDoc({ ...newDoc, titulo: e.target.value })}
              />
            </div>

            {createMode === 'pdf' ? (
              <div className="space-y-2">
                <Label>Archivo PDF *</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    id="pdf-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setPdfFile(file)
                        if (!newDoc.titulo) {
                          setNewDoc({ ...newDoc, titulo: file.name.replace('.pdf', '') })
                        }
                      }
                    }}
                  />
                  {pdfFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="h-8 w-8 text-red-500" />
                      <div className="text-left">
                        <p className="text-sm font-medium">{pdfFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(pdfFile.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setPdfFile(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label htmlFor="pdf-upload" className="cursor-pointer">
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-medium">Haz click para seleccionar un PDF</p>
                      <p className="text-xs text-muted-foreground mt-1">Maximo 1GB</p>
                    </label>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  El texto del PDF se extraera automaticamente, se dividira en fragmentos y se indexara.
                  La AI podra buscar y citar partes relevantes cuando le consultes.
                </p>
              </div>
            ) : createMode === 'url' ? (
              <div className="space-y-2">
                <Label>URL del documento</Label>
                <Input
                  placeholder="https://..."
                  type="url"
                  value={newDoc.fuente}
                  onChange={(e) => setNewDoc({ ...newDoc, fuente: e.target.value })}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Contenido *</Label>
                <Textarea
                  placeholder="Pega aqui el contenido del documento, teoria tactica, metodologia de entrenamiento, etc..."
                  rows={10}
                  value={newDoc.contenido_texto}
                  onChange={(e) => setNewDoc({ ...newDoc, contenido_texto: e.target.value })}
                />
                <p className="text-[11px] text-muted-foreground">
                  El texto se dividira en fragmentos y se indexara para busqueda semantica.
                  La AI podra encontrar y citar partes relevantes automaticamente.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateMode(null); setPdfFile(null) }}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating || !newDoc.titulo.trim() || (createMode === 'pdf' && !pdfFile)}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {createMode === 'pdf' ? 'Subiendo...' : 'Creando...'}
                </>
              ) : (
                createMode === 'pdf' ? 'Subir y procesar' : 'Crear documento'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar documento</DialogTitle>
            <DialogDescription>
              Se eliminara el documento y todos sus fragmentos indexados.
              La AI ya no podra referenciar este contenido.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
