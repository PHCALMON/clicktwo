'use client'

import { useState, useRef, useCallback } from 'react'
import type { Arquivo } from '@/lib/types'

interface FileUploadProps {
  jobId: string
  arquivos: Arquivo[]
  onUpload: (arquivo: Arquivo) => void
  onDelete: (arquivoId: string) => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string | null): string {
  if (!mimeType) return '📄'
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.startsWith('video/')) return '🎬'
  if (mimeType.startsWith('audio/')) return '🎵'
  if (mimeType.includes('pdf')) return '📕'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊'
  if (mimeType.includes('document') || mimeType.includes('word')) return '📝'
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return '📦'
  return '📄'
}

export function FileUpload({ jobId, arquivos, onUpload, onDelete }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback((files: FileList) => {
    Array.from(files).forEach((file) => {
      const arquivo: Arquivo = {
        id: `f${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        job_id: jobId,
        nome: file.name,
        storage_path: `jobs/${jobId}/${file.name}`,
        drive_url: null,
        tamanho: file.size,
        tipo_mime: file.type || null,
        uploaded_by: 'demo',
        created_at: new Date().toISOString(),
      }
      onUpload(arquivo)
    })
  }, [jobId, onUpload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
      e.target.value = ''
    }
  }, [handleFiles])

  return (
    <div>
      <h3 className="text-sm font-semibold text-text-primary mb-3">
        Arquivos ({arquivos.length})
      </h3>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors mb-3 ${
          isDragOver
            ? 'border-accent bg-accent-muted'
            : 'border-border hover:border-accent/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleInputChange}
          className="hidden"
        />
        <p className="text-sm text-text-muted">
          {isDragOver ? 'Solte os arquivos aqui' : 'Arraste arquivos ou clique para fazer upload'}
        </p>
      </div>

      {/* File list */}
      {arquivos.length > 0 && (
        <div className="space-y-1">
          {arquivos.map((arquivo) => (
            <div
              key={arquivo.id}
              className="flex items-center justify-between px-3 py-2 bg-bg-card border border-border rounded-md group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base flex-shrink-0">{getFileIcon(arquivo.tipo_mime)}</span>
                <div className="min-w-0">
                  <p className="text-sm text-text-primary truncate">{arquivo.nome}</p>
                  <p className="text-xs text-text-muted">
                    {arquivo.tamanho ? formatFileSize(arquivo.tamanho) : '—'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onDelete(arquivo.id)}
                className="text-xs text-text-muted hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 ml-2"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
