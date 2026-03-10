'use client'

import { useState } from 'react'
import type { Job, Coluna, Comentario, Arquivo } from '@/lib/types'
import { PRIORIDADES, TIPOS_JOB, TAGS } from '@/lib/constants'
import { FileUpload } from './file-upload'

interface JobDetailModalProps {
  job: Job
  colunas: Coluna[]
  onClose: () => void
  onUpdate: (job: Job) => void
  onDelete?: (jobId: string) => void
}

export function JobDetailModal({ job, colunas, onClose, onUpdate, onDelete }: JobDetailModalProps) {
  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [arquivos, setArquivos] = useState<Arquivo[]>([])
  const [novoComentario, setNovoComentario] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')

  function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    if (!novoComentario.trim()) return

    const comment: Comentario = {
      id: `com-${Date.now()}`,
      job_id: job.id,
      autor_id: 'demo',
      texto: novoComentario.trim(),
      resolvido: false,
      created_at: new Date().toISOString(),
    }
    setComentarios((prev) => [...prev, comment])
    setNovoComentario('')
  }

  function toggleResolvido(commentId: string) {
    setComentarios((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, resolvido: !c.resolvido } : c
      )
    )
  }

  function handleMoveColumn(newColunaId: string) {
    onUpdate({ ...job, coluna_id: newColunaId })
  }

  function handleFileUpload(arquivo: Arquivo) {
    setArquivos((prev) => [...prev, arquivo])
  }

  function handleFileDelete(arquivoId: string) {
    setArquivos((prev) => prev.filter((a) => a.id !== arquivoId))
  }

  const formattedDate = job.data_entrega
    ? new Date(job.data_entrega + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Sem data'

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-bg-elevated border border-border rounded-lg shadow-elevated w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-text-primary">{job.campanha}</h2>
            <div className="flex items-center gap-3 mt-1">
              {job.cliente && (
                <span className="text-sm text-text-muted">{job.cliente.nome}</span>
              )}
              {job.drive_folder_url && (
                <a
                  href={job.drive_folder_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.71 3.5L1.15 15l4.58 7.5h13.54l4.58-7.5L17.29 3.5H7.71zm-.2 1.5h3.56l-5.38 9.17L4.2 11.5 7.51 5zm4.54 0h3.5L19.8 11.5l-1.49 2.67L12.05 5zm4.72 1.32l3.12 5.35-3.13 5.33H17l3.07-5.33L16.97 6.32zM5.49 6.32L8.62 11.67l-3.13 5.33H3.93l3.12-5.33L5.49 6.32zM6.9 15.5h10.2l-1.73 3H8.63l-1.73-3z"/>
                  </svg>
                  Google Drive
                </a>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl ml-4">
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Meta info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-text-muted block mb-1">Coluna</span>
              <select
                value={job.coluna_id}
                onChange={(e) => handleMoveColumn(e.target.value)}
                className="w-full px-2 py-1.5 bg-bg-card border border-border rounded text-sm text-text-primary focus:outline-none focus:border-accent"
              >
                {colunas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <span className="text-xs text-text-muted block mb-1">Tipo</span>
              <p className="text-sm text-text-secondary px-2 py-1.5">
                {TIPOS_JOB[job.tipo_job]}
              </p>
            </div>
            <div>
              <span className="text-xs text-text-muted block mb-1">Prioridade</span>
              <div className="flex items-center gap-2 px-2 py-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: PRIORIDADES[job.prioridade].color }}
                />
                <span className="text-sm text-text-secondary">
                  {PRIORIDADES[job.prioridade].label}
                </span>
              </div>
            </div>
            <div>
              <span className="text-xs text-text-muted block mb-1">Entrega</span>
              <p className="text-sm text-text-secondary px-2 py-1.5">{formattedDate}</p>
            </div>
          </div>

          {/* Tags */}
          {job.tags.length > 0 && (
            <div>
              <span className="text-xs text-text-muted block mb-2">Tags</span>
              <div className="flex gap-2">
                {job.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-sm text-xs font-medium"
                    style={{
                      backgroundColor: `${TAGS[tag].color}20`,
                      color: TAGS[tag].color,
                    }}
                  >
                    {TAGS[tag].label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Freela */}
          <div>
            <span className="text-xs text-text-muted block mb-2">Freela</span>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={job.freela_nome ?? ''}
                onChange={(e) => onUpdate({ ...job, freela_nome: e.target.value || null })}
                placeholder="Nome do freela"
                className="px-2 py-1.5 bg-bg-card border border-border rounded text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />
              <input
                type="text"
                value={job.freela_funcao ?? ''}
                onChange={(e) => onUpdate({ ...job, freela_funcao: e.target.value || null })}
                placeholder="Função (ex: Motion Designer)"
                className="px-2 py-1.5 bg-bg-card border border-border rounded text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Files */}
          <FileUpload
            jobId={job.id}
            arquivos={arquivos}
            onUpload={handleFileUpload}
            onDelete={handleFileDelete}
          />

          {/* Delete */}
          {onDelete && (
            <div className="border-t border-border pt-4">
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
                >
                  Excluir job
                </button>
              ) : (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md space-y-2">
                  <p className="text-sm text-red-400">
                    Digite seu nome para confirmar a exclusao:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmName}
                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                    placeholder="Seu nome..."
                    autoFocus
                    className="w-full px-3 py-2 bg-bg-card border border-red-500/30 rounded-md text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-red-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (deleteConfirmName.trim().length >= 2) {
                          onDelete(job.id)
                        }
                      }}
                      disabled={deleteConfirmName.trim().length < 2}
                      className="px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-md hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Confirmar exclusao
                    </button>
                    <button
                      onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmName('') }}
                      className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-border" />

          {/* Comments */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              Comentarios ({comentarios.length})
            </h3>

            {comentarios.length === 0 && (
              <p className="text-sm text-text-muted italic mb-3">
                Nenhum comentario ainda.
              </p>
            )}

            <div className="space-y-2 mb-4">
              {comentarios.map((c) => (
                <div
                  key={c.id}
                  className={`flex items-start gap-3 p-3 rounded-md border transition-colors ${
                    c.resolvido
                      ? 'bg-bg-primary border-border opacity-60'
                      : 'bg-bg-card border-border'
                  }`}
                >
                  <button
                    onClick={() => toggleResolvido(c.id)}
                    className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                      c.resolvido
                        ? 'bg-accent border-accent text-bg-primary'
                        : 'border-border hover:border-accent'
                    }`}
                  >
                    {c.resolvido && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${c.resolvido ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                      {c.texto}
                    </p>
                    <span className="text-xs text-text-muted mt-1 block">
                      {new Date(c.created_at).toLocaleDateString('pt-BR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* New comment form */}
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                value={novoComentario}
                onChange={(e) => setNovoComentario(e.target.value)}
                placeholder="Adicionar comentario..."
                className="flex-1 px-3 py-2 bg-bg-card border border-border rounded-md text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={!novoComentario.trim()}
                className="px-4 py-2 bg-accent text-bg-primary text-sm font-semibold rounded-md hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Enviar
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
