'use client'

import { useState, useEffect, useRef } from 'react'
import type { Job, Coluna, Comentario, Arquivo, Profile, Entrega, TagJob } from '@/lib/types'
import { TIPOS_JOB, TAGS } from '@/lib/constants'
import { calcPrioridade, calcJobPrioridade } from '@/lib/priority'
import { FileUpload } from './file-upload'
import { ClientLogo } from '@/components/ui/client-logo'

interface JobDetailModalProps {
  job: Job
  colunas: Coluna[]
  currentUserId: string
  onClose: () => void
  onUpdate: (job: Job) => void
  onDelete?: (jobId: string) => void
  onEmProducaoToggle?: (jobId: string) => void
}

export function JobDetailModal({ job, colunas, currentUserId, onClose, onUpdate, onDelete, onEmProducaoToggle }: JobDetailModalProps) {
  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [arquivos, setArquivos] = useState<Arquivo[]>([])
  const [novoComentario, setNovoComentario] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [editingDriveUrl, setEditingDriveUrl] = useState(false)
  const [driveUrlInput, setDriveUrlInput] = useState(job.drive_folder_url ?? '')
  const [savingDriveUrl, setSavingDriveUrl] = useState(false)
  const [freelaNome, setFreelaNome] = useState(job.freela_nome ?? '')
  const [freelaFuncao, setFreelaFuncao] = useState(job.freela_funcao ?? '')
  const [loadingComments, setLoadingComments] = useState(true)
  const [sendingComment, setSendingComment] = useState(false)

  // Entregas state
  const [entregas, setEntregas] = useState<Entrega[]>([])
  const [novaEntregaNome, setNovaEntregaNome] = useState('')
  const [novaEntregaTag, setNovaEntregaTag] = useState<TagJob | ''>('')
  const [addingEntrega, setAddingEntrega] = useState(false)

  const [novaEntregaData, setNovaEntregaData] = useState('')
  const [novaEntregaHora, setNovaEntregaHora] = useState('')
  const [novaEntregaMargem, setNovaEntregaMargem] = useState('4')

  // Job-level deadline state
  const [jobHora, setJobHora] = useState(job.hora_entrega_cliente ?? '')
  const [jobMargem, setJobMargem] = useState(String(job.margem_horas ?? 4))

  // Tag editing state
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [editingEntregaTagId, setEditingEntregaTagId] = useState<string | null>(null)

  // @mention state
  const [membros, setMembros] = useState<Profile[]>([])
  const [mentionedIds, setMentionedIds] = useState<string[]>([])
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [mentionIndex, setMentionIndex] = useState(0)
  const [mentionStartPos, setMentionStartPos] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync entregas back to parent job for priority recalculation
  useEffect(() => {
    onUpdate({ ...job, entregas })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entregas])

  // Load comments + members on mount
  useEffect(() => {
    async function loadData() {
      const [commentsRes, membrosRes, entregasRes] = await Promise.all([
        fetch(`/api/jobs/${job.id}/comentarios`),
        fetch('/api/membros'),
        fetch(`/api/jobs/${job.id}/entregas`),
      ])
      if (commentsRes.ok) {
        const data = await commentsRes.json()
        setComentarios(data)
      }
      if (membrosRes.ok) {
        const data = await membrosRes.json()
        setMembros(data)
      }
      if (entregasRes.ok) {
        const data = await entregasRes.json()
        setEntregas(data)
      }
      setLoadingComments(false)
    }
    loadData()
  }, [job.id])

  async function handleSaveFreela(field: 'freela_nome' | 'freela_funcao', value: string) {
    const trimmed = value.trim() || null
    const currentValue = field === 'freela_nome' ? job.freela_nome : job.freela_funcao
    if (trimmed === currentValue) return
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: trimmed }),
      })
      if (res.ok) {
        const updated = await res.json()
        onUpdate({ ...job, freela_nome: updated.freela_nome, freela_funcao: updated.freela_funcao })
      }
    } catch { /* silent */ }
  }

  async function handleSaveDriveUrl() {
    setSavingDriveUrl(true)
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drive_folder_url: driveUrlInput.trim() || null }),
      })
      if (res.ok) {
        const updated = await res.json()
        onUpdate({ ...job, drive_folder_url: updated.drive_folder_url })
        setEditingDriveUrl(false)
      }
    } finally {
      setSavingDriveUrl(false)
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    if (!novoComentario.trim() || sendingComment) return

    setSendingComment(true)
    // Use tracked IDs from dropdown selections (deduplicated)
    const mencoes = Array.from(new Set(mentionedIds))

    try {
      const res = await fetch(`/api/jobs/${job.id}/comentarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: novoComentario.trim(), mencoes }),
      })
      if (res.ok) {
        const created = await res.json()
        setComentarios((prev) => [...prev, created])
        setNovoComentario('')
        setMentionedIds([])
      } else {
        const errText = await res.text()
        console.error('Erro ao salvar comentario:', res.status, errText)
      }
    } catch (err) {
      console.error('Erro de rede ao salvar comentario:', err)
    } finally {
      setSendingComment(false)
    }
  }

  async function toggleResolvido(commentId: string) {
    const comment = comentarios.find((c) => c.id === commentId)
    if (!comment) return
    const newValue = !comment.resolvido

    // Optimistic update
    setComentarios((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, resolvido: newValue } : c
      )
    )

    // Persist to database
    try {
      const res = await fetch(`/api/jobs/${job.id}/comentarios`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comentario_id: commentId, resolvido: newValue }),
      })
      if (!res.ok) {
        console.error('[comentarios] Erro ao atualizar resolvido:', res.status)
        // Revert on failure
        setComentarios((prev) =>
          prev.map((c) =>
            c.id === commentId ? { ...c, resolvido: !newValue } : c
          )
        )
      }
    } catch {
      // Revert on network error
      setComentarios((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, resolvido: !newValue } : c
        )
      )
    }
  }

  async function handleAddEntrega(e: React.FormEvent) {
    e.preventDefault()
    if (!novaEntregaNome.trim() || addingEntrega) return
    setAddingEntrega(true)
    try {
      const res = await fetch(`/api/jobs/${job.id}/entregas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: novaEntregaNome.trim(),
          tag: novaEntregaTag || null,
          data_entrega: novaEntregaData || null,
          hora_entrega_cliente: novaEntregaHora || null,
          margem_horas: parseInt(novaEntregaMargem) || 4,
        }),
      })
      if (res.ok) {
        const created = await res.json()
        setEntregas((prev) => [...prev, created])
        setNovaEntregaNome('')
        setNovaEntregaTag('')
        setNovaEntregaData('')
        setNovaEntregaHora('')
        setNovaEntregaMargem('4')
      } else {
        console.error('[entregas] Erro ao criar:', res.status, await res.text())
      }
    } catch (err) {
      console.error('[entregas] Erro de rede:', err)
    } finally {
      setAddingEntrega(false)
    }
  }

  async function toggleEntrega(entregaId: string) {
    const entrega = entregas.find((e) => e.id === entregaId)
    if (!entrega) return
    const newValue = !entrega.concluida
    setEntregas((prev) => prev.map((e) => e.id === entregaId ? { ...e, concluida: newValue } : e))
    try {
      const res = await fetch(`/api/jobs/${job.id}/entregas`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entrega_id: entregaId, concluida: newValue }),
      })
      if (!res.ok) {
        setEntregas((prev) => prev.map((e) => e.id === entregaId ? { ...e, concluida: !newValue } : e))
      }
    } catch {
      setEntregas((prev) => prev.map((e) => e.id === entregaId ? { ...e, concluida: !newValue } : e))
    }
  }

  async function deleteEntrega(entregaId: string) {
    setEntregas((prev) => prev.filter((e) => e.id !== entregaId))
    try {
      await fetch(`/api/jobs/${job.id}/entregas?entrega_id=${entregaId}`, { method: 'DELETE' })
    } catch { /* silent */ }
  }

  async function toggleJobTag(tag: TagJob) {
    const next = job.tags.includes(tag)
      ? job.tags.filter((t) => t !== tag)
      : [...job.tags, tag]
    onUpdate({ ...job, tags: next })
    await fetch(`/api/jobs/${job.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: next }),
    })
  }

  async function handleSaveJobDeadline(field: 'hora_entrega_cliente' | 'margem_horas', value: string) {
    const payload: Record<string, unknown> = {}
    if (field === 'hora_entrega_cliente') {
      payload.hora_entrega_cliente = value || null
    } else {
      payload.margem_horas = value ? parseInt(value) : 4
    }
    const updated = { ...job, ...payload }
    onUpdate(updated as Job)
    await fetch(`/api/jobs/${job.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  async function updateEntregaDeadline(entregaId: string, fields: { hora_entrega_cliente?: string | null; margem_horas?: number }) {
    setEntregas((prev) => prev.map((e) => e.id === entregaId ? { ...e, ...fields } : e))
    await fetch(`/api/jobs/${job.id}/entregas`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entrega_id: entregaId, ...fields }),
    })
  }

  async function updateEntregaDate(entregaId: string, data_entrega: string | null) {
    setEntregas((prev) => prev.map((e) => e.id === entregaId ? { ...e, data_entrega } : e))
    await fetch(`/api/jobs/${job.id}/entregas`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entrega_id: entregaId, data_entrega }),
    })
  }

  async function updateEntregaTag(entregaId: string, tag: TagJob | null) {
    setEntregas((prev) => prev.map((e) => e.id === entregaId ? { ...e, tag } : e))
    setEditingEntregaTagId(null)
    await fetch(`/api/jobs/${job.id}/entregas`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entrega_id: entregaId, tag }),
    })
  }

  async function handleMoveColumn(newColunaId: string) {
    onUpdate({ ...job, coluna_id: newColunaId })
    await fetch(`/api/jobs/${job.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coluna_id: newColunaId }),
    })
  }

  function handleFileUpload(arquivo: Arquivo) {
    setArquivos((prev) => [...prev, arquivo])
  }

  function handleFileDelete(arquivoId: string) {
    setArquivos((prev) => prev.filter((a) => a.id !== arquivoId))
  }

  // @mention input handler
  function handleCommentInput(value: string) {
    setNovoComentario(value)

    const cursorPos = inputRef.current?.selectionStart ?? value.length
    const textBeforeCursor = value.substring(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex >= 0) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
      // Only show dropdown if @ is at start or preceded by space
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' '
      if ((charBeforeAt === ' ' || lastAtIndex === 0) && !/\s/.test(textAfterAt)) {
        setShowMentionDropdown(true)
        setMentionFilter(textAfterAt.toLowerCase())
        setMentionStartPos(lastAtIndex)
        setMentionIndex(0)
        return
      }
    }

    setShowMentionDropdown(false)
  }

  function handleMentionSelect(membro: Profile) {
    const before = novoComentario.substring(0, mentionStartPos)
    const after = novoComentario.substring(
      (inputRef.current?.selectionStart ?? novoComentario.length)
    )
    const newText = `${before}@${membro.nome} ${after}`
    setNovoComentario(newText)
    setShowMentionDropdown(false)
    // Track mentioned user ID
    setMentionedIds((prev) => prev.includes(membro.id) ? prev : [...prev, membro.id])
    inputRef.current?.focus()
  }

  function handleCommentKeyDown(e: React.KeyboardEvent) {
    if (showMentionDropdown) {
      const filtered = membros.filter((m) =>
        m.nome.toLowerCase().includes(mentionFilter)
      )
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex((prev) => Math.min(prev + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (filtered[mentionIndex]) {
          e.preventDefault()
          handleMentionSelect(filtered[mentionIndex])
        }
      } else if (e.key === 'Escape') {
        setShowMentionDropdown(false)
      }
    }
  }

  const filteredMembros = membros.filter((m) =>
    m.nome.toLowerCase().includes(mentionFilter)
  )

  const formattedDate = job.data_entrega
    ? new Date(job.data_entrega + 'T00:00:00').toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Sem data'

  const prio = calcJobPrioridade(job.data_entrega, entregas, job.hora_entrega_cliente, job.margem_horas)
  const currentColuna = colunas.find((c) => c.id === job.coluna_id)
  const entregasConcluidas = entregas.filter((e) => e.concluida).length

  // Compute internal deadline display
  const prazoInterno = (() => {
    if (!jobHora) return null
    const margem = parseInt(jobMargem) || 0
    if (margem === 0) return jobHora
    const [h, m] = jobHora.split(':').map(Number)
    const totalMin = h * 60 + m - margem * 60
    const ih = Math.floor(((totalMin % 1440) + 1440) % 1440 / 60)
    const im = ((totalMin % 1440) + 1440) % 1440 % 60
    return `${String(ih).padStart(2, '0')}:${String(im).padStart(2, '0')}`
  })()

  function relativeTime(dateStr: string) {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'agora'
    if (diffMin < 60) return `${diffMin}min`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `${diffH}h`
    const diffD = Math.floor(diffH / 24)
    if (diffD < 30) return `${diffD}d`
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-bg-primary border border-border rounded-xl shadow-elevated w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <ClientLogo
              nome={job.cliente?.nome ?? 'Cliente'}
              dominio={job.cliente?.dominio}
              cor={job.cliente?.cor}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-text-primary truncate">{job.campanha}</h2>
              <p className="text-sm text-text-muted">
                {job.cliente?.nome ?? 'Cliente'} &middot; {TIPOS_JOB[job.tipo_job]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            {/* Drive link icon */}
            {job.drive_folder_url && (
              <a
                href={job.drive_folder_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-bg-card transition-colors"
                title="Abrir pasta no Drive"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </a>
            )}
            {/* Em producao toggle icon */}
            {onEmProducaoToggle && (
              <button
                onClick={() => onEmProducaoToggle(job.id)}
                className={`p-1.5 rounded-lg transition-colors ${
                  job.em_producao_por === currentUserId
                    ? 'text-emerald-400 bg-emerald-500/15'
                    : 'text-text-muted hover:text-text-secondary hover:bg-bg-card'
                }`}
                title={job.em_producao_por === currentUserId ? 'Parar producao' : 'Iniciar producao'}
              >
                {job.em_producao_por === currentUserId ? (
                  <span className="relative flex h-4 w-4 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
              </button>
            )}
            {/* Close */}
            <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-card transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── PRIORITY BANNER ── */}
        <div
          className="flex items-center justify-between px-5 py-2"
          style={{ backgroundColor: `${prio.color}15` }}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full${prio.pulse ? ' animate-pulse' : ''}`}
              style={{ backgroundColor: prio.color }}
            />
            <span className="text-sm font-medium" style={{ color: prio.color }}>
              {prio.label}
            </span>
          </div>
          {prio.countdown && (
            <span className="text-sm font-mono font-semibold" style={{ color: prio.color }}>
              {prio.countdown}
            </span>
          )}
        </div>

        {/* ── TWO-COLUMN BODY ── */}
        <div className="flex-1 overflow-y-auto flex min-h-0">

          {/* ── LEFT COLUMN (main content) ── */}
          <div className="flex-1 p-5 space-y-5 overflow-y-auto border-r border-border">

            {/* INFORMACOES */}
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Informacoes</span>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <span className="text-xs text-text-muted block mb-1">Coluna</span>
                  <div className="flex items-center gap-2">
                    {currentColuna?.cor && (
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: currentColuna.cor }} />
                    )}
                    <select
                      value={job.coluna_id}
                      onChange={(e) => handleMoveColumn(e.target.value)}
                      className="w-full px-2 py-1.5 bg-bg-card border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent"
                    >
                      {colunas.map((c) => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-text-muted block mb-1">Tipo</span>
                  <p className="text-sm text-text-secondary px-2 py-1.5">
                    {TIPOS_JOB[job.tipo_job]}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-text-muted block mb-1">Data Entrega</span>
                  <p className="text-sm text-text-secondary px-2 py-1.5">{formattedDate}</p>
                </div>
                <div>
                  <span className="text-xs text-text-muted block mb-1">Prazo do Cliente</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={jobHora}
                      onChange={(e) => {
                        setJobHora(e.target.value)
                        handleSaveJobDeadline('hora_entrega_cliente', e.target.value)
                      }}
                      className="px-2 py-1 bg-bg-card border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent [color-scheme:dark]"
                    />
                    <select
                      value={jobMargem}
                      onChange={(e) => {
                        setJobMargem(e.target.value)
                        handleSaveJobDeadline('margem_horas', e.target.value)
                      }}
                      className="px-1.5 py-1 bg-bg-card border border-border rounded-lg text-xs text-text-secondary focus:outline-none focus:border-accent"
                    >
                      <option value="0">Sem margem</option>
                      <option value="2">-2h</option>
                      <option value="4">-4h</option>
                      <option value="6">-6h</option>
                      <option value="8">-8h</option>
                    </select>
                  </div>
                  {prazoInterno && (
                    <span className="text-[10px] text-text-muted mt-1 block">
                      Interno: {prazoInterno}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* FREELA */}
            {(job.freela_nome || freelaNome) && (
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Freela</span>
                <div className="flex items-center gap-3 mt-3">
                  {/* Avatar initials */}
                  <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {(freelaNome || 'F').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={freelaNome}
                      onChange={(e) => setFreelaNome(e.target.value)}
                      onBlur={() => handleSaveFreela('freela_nome', freelaNome)}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                      placeholder="Nome do freela"
                      className="w-full text-sm font-medium text-text-primary bg-transparent focus:outline-none placeholder-text-muted"
                    />
                    <input
                      type="text"
                      value={freelaFuncao}
                      onChange={(e) => setFreelaFuncao(e.target.value)}
                      onBlur={() => handleSaveFreela('freela_funcao', freelaFuncao)}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                      placeholder="Funcao (ex: Motion Designer)"
                      className="w-full text-xs text-text-muted bg-transparent focus:outline-none placeholder-text-muted"
                    />
                  </div>
                </div>
              </div>
            )}
            {/* Show add-freela link if no freela */}
            {!job.freela_nome && !freelaNome && (
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Freela</span>
                <div className="mt-2">
                  <input
                    type="text"
                    value={freelaNome}
                    onChange={(e) => setFreelaNome(e.target.value)}
                    onBlur={() => handleSaveFreela('freela_nome', freelaNome)}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                    placeholder="+ Adicionar freela"
                    className="w-full px-2 py-1.5 text-sm text-text-muted bg-transparent border border-dashed border-border rounded-lg focus:outline-none focus:border-accent focus:text-text-primary placeholder-text-muted"
                  />
                </div>
              </div>
            )}

            {/* ENTREGAS */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Entregas</span>
                {entregas.length > 0 && (
                  <span className="text-[10px] font-bold text-accent">
                    {entregasConcluidas}/{entregas.length} CONCLUIDAS
                  </span>
                )}
              </div>

              {entregas.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {entregas.map((entrega) => (
                    <div
                      key={entrega.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                        entrega.concluida
                          ? 'bg-bg-primary border-border opacity-60'
                          : 'bg-bg-card border-border'
                      }`}
                    >
                      <button
                        onClick={() => toggleEntrega(entrega.id)}
                        className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                          entrega.concluida
                            ? 'bg-accent border-accent text-bg-primary'
                            : 'border-border hover:border-accent'
                        }`}
                      >
                        {entrega.concluida && (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <span className={`text-sm flex-1 min-w-0 ${entrega.concluida ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                        {entrega.nome}
                      </span>
                      {/* Tag badge */}
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={() => setEditingEntregaTagId(editingEntregaTagId === entrega.id ? null : entrega.id)}
                          className={`px-1.5 py-0.5 rounded-sm text-[10px] font-medium transition-colors ${
                            entrega.tag && TAGS[entrega.tag]
                              ? ''
                              : 'text-text-muted hover:text-text-secondary border border-dashed border-border'
                          }`}
                          style={entrega.tag && TAGS[entrega.tag] ? {
                            backgroundColor: `${TAGS[entrega.tag].color}20`,
                            color: TAGS[entrega.tag].color,
                          } : undefined}
                          title="Editar tag"
                        >
                          {entrega.tag && TAGS[entrega.tag] ? TAGS[entrega.tag].label : 'tag'}
                        </button>
                        {editingEntregaTagId === entrega.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setEditingEntregaTagId(null)} />
                            <div className="absolute right-0 top-full mt-1 z-50 bg-bg-primary border border-border rounded-lg shadow-elevated p-1.5 w-44 max-h-60 overflow-y-auto">
                              <button
                                onClick={() => updateEntregaTag(entrega.id, null)}
                                className={`flex items-center gap-2 w-full px-2 py-1 rounded text-xs text-left transition-colors ${
                                  !entrega.tag ? 'bg-bg-card' : 'hover:bg-bg-card'
                                }`}
                              >
                                <span className="w-2 h-2 rounded-full bg-border flex-shrink-0" />
                                <span className="text-text-muted">Nenhuma</span>
                              </button>
                              {(Object.entries(TAGS) as [TagJob, { label: string; color: string }][]).map(
                                ([value, config]) => (
                                  <button
                                    key={value}
                                    onClick={() => updateEntregaTag(entrega.id, value)}
                                    className={`flex items-center gap-2 w-full px-2 py-1 rounded text-xs text-left transition-colors ${
                                      entrega.tag === value ? 'bg-bg-card' : 'hover:bg-bg-card'
                                    }`}
                                  >
                                    <span
                                      className="w-2 h-2 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: config.color }}
                                    />
                                    <span className={entrega.tag === value ? 'text-text-primary font-medium' : 'text-text-secondary'}>
                                      {config.label}
                                    </span>
                                    {entrega.tag === value && (
                                      <span className="ml-auto text-accent text-[10px]">&#10003;</span>
                                    )}
                                  </button>
                                )
                              )}
                            </div>
                          </>
                        )}
                      </div>
                      {/* Deadline per entrega */}
                      {(() => {
                        const ep = entrega.data_entrega ? calcPrioridade(entrega.data_entrega, entrega.hora_entrega_cliente, entrega.margem_horas) : null
                        return (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <input
                              type="date"
                              value={entrega.data_entrega ?? ''}
                              onChange={(e) => updateEntregaDate(entrega.id, e.target.value || null)}
                              className="w-[100px] px-1 py-0.5 bg-transparent border border-transparent hover:border-border rounded text-[10px] text-text-muted focus:outline-none focus:border-accent [color-scheme:dark]"
                            />
                            <input
                              type="time"
                              value={entrega.hora_entrega_cliente ?? ''}
                              onChange={(e) => updateEntregaDeadline(entrega.id, { hora_entrega_cliente: e.target.value || null })}
                              className="w-[70px] px-1 py-0.5 bg-transparent border border-transparent hover:border-border rounded text-[10px] text-text-muted focus:outline-none focus:border-accent [color-scheme:dark]"
                              title="Hora do cliente"
                            />
                            <select
                              value={String(entrega.margem_horas ?? 4)}
                              onChange={(e) => updateEntregaDeadline(entrega.id, { margem_horas: parseInt(e.target.value) })}
                              className="w-[52px] px-0.5 py-0.5 bg-transparent border border-transparent hover:border-border rounded text-[10px] text-text-muted focus:outline-none focus:border-accent"
                              title="Margem de revisao"
                            >
                              <option value="0">0h</option>
                              <option value="2">-2h</option>
                              <option value="4">-4h</option>
                              <option value="6">-6h</option>
                              <option value="8">-8h</option>
                            </select>
                            {ep && ep.countdown && (
                              <span className="text-[10px] font-mono font-semibold" style={{ color: ep.color }}>
                                {ep.countdown}
                              </span>
                            )}
                          </div>
                        )
                      })()}
                      <button
                        onClick={() => deleteEntrega(entrega.id)}
                        className="text-text-muted hover:text-red-400 transition-colors text-xs flex-shrink-0"
                        title="Remover"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add entrega form */}
              <form onSubmit={handleAddEntrega} className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={novaEntregaNome}
                  onChange={(e) => setNovaEntregaNome(e.target.value)}
                  placeholder="+ Adicionar entrega"
                  className="flex-1 min-w-[120px] px-2 py-1.5 bg-bg-card border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                />
                <input
                  type="date"
                  value={novaEntregaData}
                  onChange={(e) => setNovaEntregaData(e.target.value)}
                  className="px-2 py-1.5 bg-bg-card border border-border rounded-lg text-xs text-text-secondary focus:outline-none focus:border-accent [color-scheme:dark]"
                  title="Data de entrega"
                />
                <input
                  type="time"
                  value={novaEntregaHora}
                  onChange={(e) => setNovaEntregaHora(e.target.value)}
                  className="px-2 py-1.5 bg-bg-card border border-border rounded-lg text-xs text-text-secondary focus:outline-none focus:border-accent [color-scheme:dark]"
                  title="Hora do cliente"
                />
                <select
                  value={novaEntregaMargem}
                  onChange={(e) => setNovaEntregaMargem(e.target.value)}
                  className="px-1 py-1.5 bg-bg-card border border-border rounded-lg text-xs text-text-secondary focus:outline-none focus:border-accent"
                  title="Margem"
                >
                  <option value="0">0h</option>
                  <option value="2">-2h</option>
                  <option value="4">-4h</option>
                  <option value="6">-6h</option>
                  <option value="8">-8h</option>
                </select>
                <select
                  value={novaEntregaTag}
                  onChange={(e) => setNovaEntregaTag(e.target.value as TagJob | '')}
                  className="px-2 py-1.5 bg-bg-card border border-border rounded-lg text-xs text-text-secondary focus:outline-none focus:border-accent"
                >
                  <option value="">Tag</option>
                  {(Object.entries(TAGS) as [TagJob, { label: string; color: string }][]).map(
                    ([value, config]) => (
                      <option key={value} value={value}>{config.label}</option>
                    )
                  )}
                </select>
                <button
                  type="submit"
                  disabled={!novaEntregaNome.trim() || addingEntrega}
                  className="px-3 py-1.5 bg-accent text-bg-primary text-xs font-semibold rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {addingEntrega ? '...' : '+'}
                </button>
              </form>
            </div>

            {/* TAGS */}
            <div className="relative">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Tags</span>
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                {job.tags.map((tag) => TAGS[tag] && (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium"
                    style={{
                      backgroundColor: `${TAGS[tag].color}20`,
                      color: TAGS[tag].color,
                    }}
                  >
                    {TAGS[tag].label}
                  </span>
                ))}
                <button
                  onClick={() => setShowTagPicker((v) => !v)}
                  className="px-2 py-1 rounded-lg text-xs text-text-muted hover:text-accent hover:bg-bg-card border border-dashed border-border transition-colors"
                  title="Editar tags"
                >
                  + Tag
                </button>
              </div>
              {showTagPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowTagPicker(false)} />
                  <div className="absolute left-0 top-full mt-1 z-50 bg-bg-primary border border-border rounded-lg shadow-elevated p-2 w-52 max-h-72 overflow-y-auto">
                    {(Object.entries(TAGS) as [TagJob, { label: string; color: string }][]).map(
                      ([value, config]) => {
                        const active = job.tags.includes(value)
                        return (
                          <button
                            key={value}
                            onClick={() => toggleJobTag(value)}
                            className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-left transition-colors ${
                              active ? 'bg-bg-card' : 'hover:bg-bg-card'
                            }`}
                          >
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: config.color }}
                            />
                            <span className={active ? 'text-text-primary font-medium' : 'text-text-secondary'}>
                              {config.label}
                            </span>
                            {active && (
                              <span className="ml-auto text-accent text-[10px]">&#10003;</span>
                            )}
                          </button>
                        )
                      }
                    )}
                  </div>
                </>
              )}
            </div>

            {/* FILES */}
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-3 block">Arquivos</span>
              <FileUpload
                jobId={job.id}
                arquivos={arquivos}
                onUpload={handleFileUpload}
                onDelete={handleFileDelete}
              />
            </div>

            {/* ── DELETE (absolute bottom, very subtle) ── */}
            {onDelete && (
              <div className="pt-8 mt-8 border-t border-border/30">
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-xs text-red-400/40 hover:text-red-400/70 transition-colors"
                  >
                    Excluir job
                  </button>
                ) : (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg space-y-2">
                    <p className="text-sm text-red-400">
                      Digite seu nome para confirmar a exclusao:
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmName}
                      onChange={(e) => setDeleteConfirmName(e.target.value)}
                      placeholder="Seu nome..."
                      autoFocus
                      className="w-full px-3 py-2 bg-bg-card border border-red-500/30 rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-red-400"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (deleteConfirmName.trim().length >= 2) {
                            onDelete(job.id)
                          }
                        }}
                        disabled={deleteConfirmName.trim().length < 2}
                        className="px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
          </div>

          {/* ── RIGHT COLUMN (sidebar) ── */}
          <div className="w-[320px] flex-shrink-0 p-5 space-y-5 overflow-y-auto">

            {/* STATUS */}
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Status</span>
              <div className="mt-2">
                {job.em_producao_por === currentUserId ? (
                  <button
                    onClick={() => onEmProducaoToggle?.(job.id)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 transition-colors hover:bg-emerald-500/25"
                  >
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    Em Producao
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    {currentColuna?.cor && (
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: currentColuna.cor }} />
                    )}
                    <span className="text-sm text-text-secondary">{currentColuna?.nome ?? 'Sem coluna'}</span>
                  </div>
                )}
                {job.em_producao_por && job.em_producao_por !== currentUserId && (
                  <p className="text-[10px] text-text-muted mt-1">Outro membro esta produzindo</p>
                )}
              </div>
            </div>

            {/* GOOGLE DRIVE */}
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Google Drive</span>
              <div className="mt-2">
                {!editingDriveUrl ? (
                  <button
                    onClick={() => { setDriveUrlInput(job.drive_folder_url ?? ''); setEditingDriveUrl(true) }}
                    className={`flex items-center gap-2 text-sm transition-colors ${
                      job.drive_folder_url
                        ? 'text-accent hover:text-accent-hover'
                        : 'text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    {job.drive_folder_url ? 'Abrir pasta do job' : '+ Adicionar link'}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={driveUrlInput}
                      onChange={(e) => setDriveUrlInput(e.target.value)}
                      placeholder="Cole a URL da pasta do Drive..."
                      autoFocus
                      className="w-full px-2 py-1.5 bg-bg-card border border-border rounded-lg text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveDriveUrl()
                        if (e.key === 'Escape') setEditingDriveUrl(false)
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveDriveUrl}
                        disabled={savingDriveUrl}
                        className="px-3 py-1 bg-accent text-bg-primary text-xs font-semibold rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
                      >
                        {savingDriveUrl ? '...' : 'Salvar'}
                      </button>
                      {job.drive_folder_url && (
                        <a
                          href={job.drive_folder_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:text-accent-hover text-xs"
                        >
                          Abrir
                        </a>
                      )}
                      <button
                        onClick={() => setEditingDriveUrl(false)}
                        className="text-text-muted hover:text-text-primary text-xs ml-auto"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* COMENTARIOS */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Comentarios</span>
                <span className="text-[10px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                  {comentarios.length}
                </span>
              </div>

              <div className="mt-3 space-y-3">
                {loadingComments ? (
                  <p className="text-xs text-text-muted italic">Carregando...</p>
                ) : comentarios.length === 0 ? (
                  <p className="text-xs text-text-muted italic">
                    Nenhum comentario ainda.
                  </p>
                ) : null}

                {comentarios.map((c) => (
                  <div
                    key={c.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      c.resolvido
                        ? 'bg-bg-primary border-border opacity-60'
                        : 'bg-bg-card border-border'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => toggleResolvido(c.id)}
                        className={`mt-0.5 w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                          c.resolvido
                            ? 'bg-accent border-accent text-bg-primary'
                            : 'border-border hover:border-accent'
                        }`}
                      >
                        {c.resolvido && (
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {/* Avatar initials */}
                          <span className="w-5 h-5 rounded-md bg-accent/15 text-accent text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                            {(c.autor?.nome ?? 'M').charAt(0).toUpperCase()}
                          </span>
                          <span className="text-xs font-semibold text-text-primary">
                            {c.autor?.nome ?? 'Membro'}
                          </span>
                          <span className="text-[10px] text-text-muted ml-auto flex-shrink-0">
                            {relativeTime(c.created_at)}
                          </span>
                        </div>
                        <p className={`text-xs mt-1 leading-relaxed ${c.resolvido ? 'line-through text-text-muted' : 'text-text-secondary'}`}>
                          {renderMentionText(c.texto)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* New comment form with @mention */}
              <form onSubmit={handleAddComment} className="relative mt-3">
                <div className="relative bg-bg-card border border-border rounded-lg focus-within:border-accent">
                  {/* Highlight overlay */}
                  <div
                    aria-hidden
                    className="absolute inset-0 px-3 py-2 text-xs pointer-events-none overflow-hidden whitespace-pre z-[1]"
                  >
                    {novoComentario.split(/(@\S+)/g).map((part, i) =>
                      part.startsWith('@') ? (
                        <span key={i} className="text-accent font-medium">{part}</span>
                      ) : (
                        <span key={i} className="text-text-primary">{part}</span>
                      )
                    )}
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={novoComentario}
                    onChange={(e) => handleCommentInput(e.target.value)}
                    onKeyDown={handleCommentKeyDown}
                    placeholder="Comentar... (@ para mencionar)"
                    className="w-full px-3 py-2 bg-transparent text-xs placeholder-text-muted focus:outline-none relative"
                    style={{ color: 'transparent', caretColor: 'var(--text-primary)' }}
                  />

                  {/* @mention dropdown */}
                  {showMentionDropdown && filteredMembros.length > 0 && (
                    <div className="absolute bottom-full left-0 mb-1 w-full bg-bg-primary border border-border rounded-lg shadow-elevated overflow-hidden z-50">
                      {filteredMembros.map((m, i) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleMentionSelect(m)}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${
                            i === mentionIndex
                              ? 'bg-accent/15 text-accent'
                              : 'text-text-primary hover:bg-bg-card'
                          }`}
                        >
                          <span className="w-5 h-5 rounded-md bg-accent/20 text-accent text-[9px] font-bold flex items-center justify-center">
                            {m.nome.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <span className="font-medium">{m.nome}</span>
                            <span className="text-[10px] text-text-muted ml-1.5">{m.email}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!novoComentario.trim() || sendingComment}
                  className="mt-2 w-full px-3 py-1.5 bg-accent text-bg-primary text-xs font-semibold rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {sendingComment ? '...' : 'Enviar'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Render @mentions as highlighted text
function renderMentionText(text: string) {
  const parts = text.split(/(@\w[\w\s]*?)(?=\s|$)/g)
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span key={i} className="text-accent font-medium">
          {part}
        </span>
      )
    }
    return part
  })
}
