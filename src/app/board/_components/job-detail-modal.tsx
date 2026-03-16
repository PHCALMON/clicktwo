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
    if (diffMin < 60) return `ha ${diffMin}min`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `ha ${diffH}h`
    const diffD = Math.floor(diffH / 24)
    if (diffD < 30) return `ha ${diffD}d`
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[880px] mx-4 flex flex-col max-h-[90vh]"
        style={{
          background: '#141416',
          border: '1px solid #2A2A2C',
          borderRadius: '12px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div className="flex items-center justify-between" style={{ padding: '20px 28px', borderBottom: '1px solid #2A2A2C' }}>
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <ClientLogo
              nome={job.cliente?.nome ?? 'Cliente'}
              dominio={job.cliente?.dominio}
              cor={job.cliente?.cor}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-white truncate" style={{ fontSize: '18px' }}>{job.campanha}</h2>
              <p style={{ fontSize: '13px', color: '#8E8E93', marginTop: '2px' }}>
                {job.cliente?.nome ?? 'Cliente'} &middot; {TIPOS_JOB[job.tipo_job]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            {/* Drive link icon button */}
            {job.drive_folder_url && (
              <a
                href={job.drive_folder_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center transition-all"
                style={{
                  width: '36px', height: '36px', borderRadius: '6px',
                  border: '1px solid #2A2A2C', color: '#5A5A5E',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3A3A3C'; e.currentTarget.style.color = '#8E8E93'; e.currentTarget.style.background = '#252528' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2A2A2C'; e.currentTarget.style.color = '#5A5A5E'; e.currentTarget.style.background = 'none' }}
                title="Abrir pasta no Drive"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </a>
            )}
            {/* Delete icon button (trash) */}
            {onDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center justify-center transition-all"
                style={{
                  width: '36px', height: '36px', borderRadius: '6px',
                  border: '1px solid #2A2A2C', color: '#5A5A5E', background: 'none',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3A3A3C'; e.currentTarget.style.color = '#F24822'; e.currentTarget.style.background = 'rgba(242,72,34,0.1)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2A2A2C'; e.currentTarget.style.color = '#5A5A5E'; e.currentTarget.style.background = 'none' }}
                title="Deletar"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            )}
            {/* Close X button */}
            <button
              onClick={onClose}
              className="flex items-center justify-center transition-all"
              style={{
                width: '36px', height: '36px', borderRadius: '6px',
                border: '1px solid #2A2A2C', color: '#5A5A5E', background: 'none',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3A3A3C'; e.currentTarget.style.color = '#8E8E93'; e.currentTarget.style.background = '#252528' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2A2A2C'; e.currentTarget.style.color = '#5A5A5E'; e.currentTarget.style.background = 'none' }}
              title="Fechar"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── DELETE CONFIRMATION (inline, appears below header) ── */}
        {showDeleteConfirm && (
          <div className="px-7 py-3" style={{ background: 'rgba(242,72,34,0.08)', borderBottom: '1px solid rgba(242,72,34,0.2)' }}>
            <p style={{ fontSize: '13px', color: '#F24822', fontWeight: 500, marginBottom: '8px' }}>
              Digite seu nome para confirmar a exclusao:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder="Seu nome..."
                autoFocus
                className="flex-1 focus:outline-none"
                style={{
                  padding: '8px 12px', background: '#1A1A1D', border: '1px solid rgba(242,72,34,0.3)',
                  borderRadius: '8px', fontSize: '13px', color: '#E5E5E7',
                }}
              />
              <button
                onClick={() => {
                  if (deleteConfirmName.trim().length >= 2) {
                    onDelete?.(job.id)
                  }
                }}
                disabled={deleteConfirmName.trim().length < 2}
                style={{
                  padding: '8px 16px', background: '#F24822', color: 'white',
                  fontSize: '12px', fontWeight: 600, borderRadius: '8px', border: 'none',
                  opacity: deleteConfirmName.trim().length < 2 ? 0.4 : 1,
                  cursor: deleteConfirmName.trim().length < 2 ? 'not-allowed' : 'pointer',
                }}
              >
                Confirmar
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmName('') }}
                style={{ fontSize: '12px', color: '#8E8E93', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* ── TWO-COLUMN BODY ── */}
        <div className="flex flex-1 min-h-0" style={{ minHeight: '600px' }}>

          {/* ── LEFT COLUMN ── */}
          <div className="flex-1 overflow-y-auto" style={{ padding: '24px 28px', borderRight: '1px solid #2A2A2C' }}>

            {/* PRIORITY BANNER */}
            <div
              className="flex items-center gap-2.5"
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '20px',
                background: `${prio.color}15`,
                border: `1px solid ${prio.color}33`,
              }}
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0${prio.pulse ? ' animate-pulse' : ''}`}
                style={{ backgroundColor: prio.color }}
              />
              <span style={{ fontSize: '13px', fontWeight: 600, color: prio.color }}>
                {prio.label}
              </span>
              {prio.countdown && (
                <span style={{ fontSize: '13px', fontWeight: 700, color: prio.color, marginLeft: 'auto' }}>
                  {prio.countdown}
                </span>
              )}
            </div>

            {/* INFORMACOES */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#5A5A5E', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>
                Informacoes
              </div>
              <div className="grid grid-cols-2" style={{ gap: '12px' }}>
                {/* Coluna */}
                <div style={{ background: '#1C1C1E', border: '1px solid #2A2A2C', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#5A5A5E', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>
                    Coluna
                  </div>
                  <div className="flex items-center gap-1.5">
                    {currentColuna?.cor && (
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: currentColuna.cor }} />
                    )}
                    <select
                      value={job.coluna_id}
                      onChange={(e) => handleMoveColumn(e.target.value)}
                      className="w-full focus:outline-none"
                      style={{ fontSize: '14px', fontWeight: 600, color: '#E5E5E7', background: 'transparent', border: 'none' }}
                    >
                      {colunas.map((c) => (
                        <option key={c.id} value={c.id} style={{ background: '#1C1C1E' }}>{c.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {/* Tipo */}
                <div style={{ background: '#1C1C1E', border: '1px solid #2A2A2C', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#5A5A5E', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>
                    Tipo
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#E5E5E7' }}>
                    {TIPOS_JOB[job.tipo_job]}
                  </div>
                </div>
                {/* Data Entrega */}
                <div style={{ background: '#1C1C1E', border: '1px solid #2A2A2C', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#5A5A5E', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>
                    Data Entrega
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#E5E5E7' }}>
                    {formattedDate}
                  </div>
                </div>
                {/* Prazo do Cliente */}
                <div style={{ background: '#1C1C1E', border: '1px solid #2A2A2C', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#5A5A5E', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>
                    Prazo do Cliente
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <input
                      type="time"
                      value={jobHora}
                      onChange={(e) => {
                        setJobHora(e.target.value)
                        handleSaveJobDeadline('hora_entrega_cliente', e.target.value)
                      }}
                      className="focus:outline-none [color-scheme:dark]"
                      style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93', background: 'transparent', border: 'none', width: '60px' }}
                    />
                    {jobHora && (
                      <>
                        <span style={{ fontSize: '12px', color: '#5A5A5E', fontWeight: 400 }}>&rarr; interno </span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: prio.color }}>
                          {prazoInterno ?? jobHora}
                        </span>
                      </>
                    )}
                    <select
                      value={jobMargem}
                      onChange={(e) => {
                        setJobMargem(e.target.value)
                        handleSaveJobDeadline('margem_horas', e.target.value)
                      }}
                      className="focus:outline-none"
                      style={{ fontSize: '10px', color: '#5A5A5E', fontWeight: 400, background: 'transparent', border: 'none' }}
                    >
                      <option value="0">Sem margem</option>
                      <option value="2">(-2h)</option>
                      <option value="4">(-4h)</option>
                      <option value="6">(-6h)</option>
                      <option value="8">(-8h)</option>
                    </select>
                  </div>
                </div>
                {/* Responsavel */}
                <div style={{ background: '#1C1C1E', border: '1px solid #2A2A2C', borderRadius: '8px', padding: '12px', gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#5A5A5E', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>
                    Responsavel
                  </div>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const assignee = membros.find((m) => m.id === job.assignee_id)
                      if (assignee) {
                        return (
                          <div
                            className="flex items-center justify-center flex-shrink-0"
                            style={{
                              width: '24px', height: '24px', borderRadius: '9999px',
                              background: 'rgba(99,102,241,0.15)', color: '#818CF8',
                              fontWeight: 700, fontSize: '10px',
                            }}
                          >
                            {assignee.avatar_url ? (
                              <img src={assignee.avatar_url} alt="" style={{ width: '24px', height: '24px', borderRadius: '9999px', objectFit: 'cover' }} />
                            ) : (
                              assignee.nome.substring(0, 2).toUpperCase()
                            )}
                          </div>
                        )
                      }
                      return null
                    })()}
                    <select
                      value={job.assignee_id ?? ''}
                      onChange={async (e) => {
                        const newAssigneeId = e.target.value || null
                        onUpdate({ ...job, assignee_id: newAssigneeId })
                        await fetch(`/api/jobs/${job.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ assignee_id: newAssigneeId }),
                        })
                      }}
                      className="w-full focus:outline-none"
                      style={{ fontSize: '14px', fontWeight: 600, color: '#E5E5E7', background: 'transparent', border: 'none' }}
                    >
                      <option value="" style={{ background: '#1C1C1E' }}>Sem responsavel</option>
                      {membros.map((m) => (
                        <option key={m.id} value={m.id} style={{ background: '#1C1C1E' }}>{m.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* FREELA */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#5A5A5E', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>
                Freela
              </div>
              {(job.freela_nome || freelaNome) ? (
                <div
                  className="flex items-center"
                  style={{ gap: '12px', padding: '14px', background: '#1C1C1E', border: '1px solid #2A2A2C', borderRadius: '8px' }}
                >
                  {/* Freela avatar — circle, orange */}
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: '36px', height: '36px', borderRadius: '9999px',
                      background: 'rgba(255,140,0,0.15)', color: '#FF8C00',
                      fontWeight: 700, fontSize: '14px',
                    }}
                  >
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
                      className="w-full focus:outline-none"
                      style={{ fontSize: '14px', fontWeight: 600, color: '#E5E5E7', background: 'transparent', border: 'none' }}
                    />
                    <input
                      type="text"
                      value={freelaFuncao}
                      onChange={(e) => setFreelaFuncao(e.target.value)}
                      onBlur={() => handleSaveFreela('freela_funcao', freelaFuncao)}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                      placeholder="Funcao (ex: Motion Designer)"
                      className="w-full focus:outline-none"
                      style={{ fontSize: '12px', color: '#FF8C00', background: 'transparent', border: 'none' }}
                    />
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  value={freelaNome}
                  onChange={(e) => setFreelaNome(e.target.value)}
                  onBlur={() => handleSaveFreela('freela_nome', freelaNome)}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                  placeholder="+ Adicionar freela"
                  className="w-full focus:outline-none"
                  style={{
                    padding: '14px', fontSize: '13px', color: '#5A5A5E',
                    background: 'transparent', border: '1px dashed #2A2A2C', borderRadius: '8px',
                  }}
                />
              )}
            </div>

            {/* ENTREGAS */}
            <div style={{ marginBottom: '28px' }}>
              <div className="flex items-center justify-between" style={{ fontSize: '11px', fontWeight: 600, color: '#5A5A5E', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>
                <span>Entregas</span>
                {entregas.length > 0 && (
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#14AE5C', letterSpacing: 'normal', textTransform: 'uppercase' }}>
                    {entregasConcluidas}/{entregas.length} concluidas
                  </span>
                )}
              </div>

              {entregas.length > 0 && (
                <div>
                  {entregas.map((entrega) => {
                    const ep = entrega.data_entrega ? calcPrioridade(entrega.data_entrega, entrega.hora_entrega_cliente, entrega.margem_horas) : null
                    return (
                      <div
                        key={entrega.id}
                        className="flex gap-2.5"
                        style={{ padding: '10px 0', borderBottom: '1px solid #2A2A2C', alignItems: 'flex-start' }}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleEntrega(entrega.id)}
                          className="flex items-center justify-center flex-shrink-0 transition-all"
                          style={{
                            width: '18px', height: '18px', borderRadius: '4px', marginTop: '1px',
                            border: entrega.concluida ? '2px solid #14AE5C' : '2px solid #3A3A3C',
                            background: entrega.concluida ? '#14AE5C' : 'transparent',
                            color: entrega.concluida ? 'white' : 'transparent',
                          }}
                        >
                          {entrega.concluida && (
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div
                            style={{
                              fontSize: '13px', fontWeight: 500,
                              color: entrega.concluida ? '#5A5A5E' : '#E5E5E7',
                              textDecoration: entrega.concluida ? 'line-through' : 'none',
                            }}
                          >
                            {entrega.nome}
                          </div>
                          {/* Meta row: tag + deadline */}
                          <div className="flex items-center gap-2" style={{ marginTop: '4px' }}>
                            {/* Tag badge */}
                            <div className="relative">
                              <button
                                onClick={() => setEditingEntregaTagId(editingEntregaTagId === entrega.id ? null : entrega.id)}
                                style={{
                                  fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
                                  borderRadius: '9999px', padding: '2px 7px',
                                  background: entrega.tag && TAGS[entrega.tag] ? `${TAGS[entrega.tag].color}26` : 'transparent',
                                  color: entrega.tag && TAGS[entrega.tag] ? TAGS[entrega.tag].color : '#5A5A5E',
                                  border: entrega.tag && TAGS[entrega.tag] ? 'none' : '1px dashed #2A2A2C',
                                  cursor: 'pointer',
                                }}
                                title="Editar tag"
                              >
                                {entrega.tag && TAGS[entrega.tag] ? TAGS[entrega.tag].label : 'tag'}
                              </button>
                              {editingEntregaTagId === entrega.id && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setEditingEntregaTagId(null)} />
                                  <div className="absolute left-0 top-full mt-1 z-50 overflow-y-auto" style={{ background: '#141416', border: '1px solid #2A2A2C', borderRadius: '8px', padding: '6px', width: '176px', maxHeight: '240px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                                    <button
                                      onClick={() => updateEntregaTag(entrega.id, null)}
                                      className="flex items-center gap-2 w-full text-left transition-colors"
                                      style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: !entrega.tag ? '#1A1A1D' : 'transparent' }}
                                    >
                                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#2A2A2C' }} />
                                      <span style={{ color: '#5A5A5E' }}>Nenhuma</span>
                                    </button>
                                    {(Object.entries(TAGS) as [TagJob, { label: string; color: string }][]).map(
                                      ([value, config]) => (
                                        <button
                                          key={value}
                                          onClick={() => updateEntregaTag(entrega.id, value)}
                                          className="flex items-center gap-2 w-full text-left transition-colors"
                                          style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', background: entrega.tag === value ? '#1A1A1D' : 'transparent' }}
                                        >
                                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: config.color }} />
                                          <span style={{ color: entrega.tag === value ? '#E5E5E7' : '#8E8E93', fontWeight: entrega.tag === value ? 500 : 400 }}>
                                            {config.label}
                                          </span>
                                          {entrega.tag === value && (
                                            <span className="ml-auto" style={{ color: '#4A90D9', fontSize: '10px' }}>&#10003;</span>
                                          )}
                                        </button>
                                      )
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                            {/* Entrega deadline controls */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <input
                                type="date"
                                value={entrega.data_entrega ?? ''}
                                onChange={(e) => updateEntregaDate(entrega.id, e.target.value || null)}
                                className="focus:outline-none [color-scheme:dark]"
                                style={{ width: '90px', fontSize: '10px', fontWeight: 600, color: '#5A5A5E', background: 'transparent', border: 'none' }}
                              />
                              <input
                                type="time"
                                value={entrega.hora_entrega_cliente ?? ''}
                                onChange={(e) => updateEntregaDeadline(entrega.id, { hora_entrega_cliente: e.target.value || null })}
                                className="focus:outline-none [color-scheme:dark]"
                                style={{ width: '60px', fontSize: '10px', fontWeight: 600, color: '#5A5A5E', background: 'transparent', border: 'none' }}
                                title="Hora do cliente"
                              />
                              <select
                                value={String(entrega.margem_horas ?? 4)}
                                onChange={(e) => updateEntregaDeadline(entrega.id, { margem_horas: parseInt(e.target.value) })}
                                className="focus:outline-none"
                                style={{ width: '44px', fontSize: '10px', fontWeight: 600, color: '#5A5A5E', background: 'transparent', border: 'none' }}
                                title="Margem de revisao"
                              >
                                <option value="0">0h</option>
                                <option value="2">-2h</option>
                                <option value="4">-4h</option>
                                <option value="6">-6h</option>
                                <option value="8">-8h</option>
                              </select>
                              {ep && ep.countdown && (
                                <span style={{ fontSize: '10px', fontWeight: 600, color: ep.color, fontFamily: 'monospace' }}>
                                  {ep.countdown}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Delete entrega */}
                        <button
                          onClick={() => deleteEntrega(entrega.id)}
                          className="flex-shrink-0 transition-colors"
                          style={{ fontSize: '14px', color: '#5A5A5E', background: 'none', border: 'none', cursor: 'pointer', marginTop: '2px' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#F24822' }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = '#5A5A5E' }}
                          title="Remover"
                        >
                          &times;
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Add entrega form */}
              <form onSubmit={handleAddEntrega} className="flex items-center gap-2 flex-wrap" style={{ padding: '10px 0' }}>
                <input
                  type="text"
                  value={novaEntregaNome}
                  onChange={(e) => setNovaEntregaNome(e.target.value)}
                  placeholder="+ Adicionar entrega"
                  className="flex-1 min-w-[120px] focus:outline-none"
                  style={{ fontSize: '13px', color: '#5A5A5E', background: 'transparent', border: 'none', cursor: 'text' }}
                />
                {novaEntregaNome.trim() && (
                  <>
                    <input
                      type="date"
                      value={novaEntregaData}
                      onChange={(e) => setNovaEntregaData(e.target.value)}
                      className="focus:outline-none [color-scheme:dark]"
                      style={{ padding: '4px 8px', background: '#1A1A1D', border: '1px solid #2A2A2C', borderRadius: '8px', fontSize: '11px', color: '#8E8E93' }}
                      title="Data de entrega"
                    />
                    <input
                      type="time"
                      value={novaEntregaHora}
                      onChange={(e) => setNovaEntregaHora(e.target.value)}
                      className="focus:outline-none [color-scheme:dark]"
                      style={{ padding: '4px 8px', background: '#1A1A1D', border: '1px solid #2A2A2C', borderRadius: '8px', fontSize: '11px', color: '#8E8E93' }}
                      title="Hora do cliente"
                    />
                    <select
                      value={novaEntregaMargem}
                      onChange={(e) => setNovaEntregaMargem(e.target.value)}
                      className="focus:outline-none"
                      style={{ padding: '4px', background: '#1A1A1D', border: '1px solid #2A2A2C', borderRadius: '8px', fontSize: '11px', color: '#8E8E93' }}
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
                      className="focus:outline-none"
                      style={{ padding: '4px 8px', background: '#1A1A1D', border: '1px solid #2A2A2C', borderRadius: '8px', fontSize: '11px', color: '#8E8E93' }}
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
                      style={{
                        padding: '4px 12px', background: '#4A90D9', color: 'white',
                        fontSize: '12px', fontWeight: 600, borderRadius: '8px', border: 'none',
                        opacity: (!novaEntregaNome.trim() || addingEntrega) ? 0.4 : 1,
                        cursor: (!novaEntregaNome.trim() || addingEntrega) ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {addingEntrega ? '...' : '+'}
                    </button>
                  </>
                )}
              </form>
            </div>

            {/* TAGS */}
            <div className="relative" style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#5A5A5E', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>
                Tags
              </div>
              <div className="flex flex-wrap" style={{ gap: '6px' }}>
                {job.tags.map((tag) => TAGS[tag] && (
                  <span
                    key={tag}
                    style={{
                      fontSize: '11px', fontWeight: 600, padding: '4px 12px',
                      borderRadius: '9999px', cursor: 'pointer',
                      background: `${TAGS[tag].color}26`,
                      color: TAGS[tag].color,
                    }}
                  >
                    {TAGS[tag].label}
                  </span>
                ))}
                <button
                  onClick={() => setShowTagPicker((v) => !v)}
                  style={{
                    fontSize: '11px', fontWeight: 600, padding: '4px 12px',
                    borderRadius: '9999px', cursor: 'pointer',
                    background: 'transparent', color: '#5A5A5E',
                    border: '1px dashed #2A2A2C',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#4A90D9' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#5A5A5E' }}
                  title="Editar tags"
                >
                  + Tag
                </button>
              </div>
              {showTagPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowTagPicker(false)} />
                  <div className="absolute left-0 top-full mt-1 z-50 overflow-y-auto" style={{ background: '#141416', border: '1px solid #2A2A2C', borderRadius: '8px', padding: '8px', width: '208px', maxHeight: '288px', boxShadow: '0 12px 32px rgba(0,0,0,0.6)' }}>
                    {(Object.entries(TAGS) as [TagJob, { label: string; color: string }][]).map(
                      ([value, config]) => {
                        const active = job.tags.includes(value)
                        return (
                          <button
                            key={value}
                            onClick={() => toggleJobTag(value)}
                            className="flex items-center gap-2 w-full text-left transition-colors"
                            style={{ padding: '6px 8px', borderRadius: '6px', fontSize: '12px', background: active ? '#1A1A1D' : 'transparent' }}
                          >
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: config.color }} />
                            <span style={{ color: active ? '#E5E5E7' : '#8E8E93', fontWeight: active ? 500 : 400 }}>
                              {config.label}
                            </span>
                            {active && (
                              <span className="ml-auto" style={{ color: '#4A90D9', fontSize: '10px' }}>&#10003;</span>
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
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#5A5A5E', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>
                Arquivos
              </div>
              <FileUpload
                jobId={job.id}
                arquivos={arquivos}
                onUpload={handleFileUpload}
                onDelete={handleFileDelete}
              />
            </div>

          </div>

          {/* ── RIGHT COLUMN (sidebar) ── */}
          <div className="flex-shrink-0 overflow-y-auto" style={{ width: '300px', padding: '24px 20px' }}>

            {/* STATUS */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#5A5A5E', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>
                Status
              </div>
              <div style={{ background: '#1C1C1E', border: '1px solid #2A2A2C', borderRadius: '8px', padding: '14px' }}>
                {job.em_producao_por === currentUserId ? (
                  <button
                    onClick={() => onEmProducaoToggle?.(job.id)}
                    className="flex items-center gap-2.5 w-full transition-all"
                    style={{
                      padding: '12px 14px', borderRadius: '8px', cursor: 'pointer',
                      background: 'rgba(20,174,92,0.08)', border: '1px solid rgba(20,174,92,0.2)',
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
                      style={{ background: '#14AE5C' }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#14AE5C' }}>
                      Produzindo
                    </span>
                  </button>
                ) : onEmProducaoToggle ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {currentColuna?.cor && (
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: currentColuna.cor }} />
                      )}
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#8E8E93' }}>{currentColuna?.nome ?? 'Sem coluna'}</span>
                    </div>
                    <button
                      onClick={() => onEmProducaoToggle(job.id)}
                      className="flex items-center justify-center gap-2 w-full transition-all hover:opacity-80"
                      style={{
                        padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
                        background: 'rgba(74,144,217,0.1)', border: '1px solid rgba(74,144,217,0.25)',
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5" style={{ color: '#4A90D9' }}>
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#4A90D9' }}>
                        Produzir este job
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {currentColuna?.cor && (
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: currentColuna.cor }} />
                    )}
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#8E8E93' }}>{currentColuna?.nome ?? 'Sem coluna'}</span>
                  </div>
                )}
                {job.em_producao_por && job.em_producao_por !== currentUserId && (
                  <p style={{ fontSize: '10px', color: '#5A5A5E', marginTop: '6px' }}>Outro membro esta produzindo</p>
                )}
              </div>
            </div>

            {/* GOOGLE DRIVE */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#5A5A5E', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>
                Google Drive
              </div>
              <div style={{ background: '#1C1C1E', border: '1px solid #2A2A2C', borderRadius: '8px', padding: '14px' }}>
                {!editingDriveUrl ? (
                  <button
                    onClick={() => {
                      if (job.drive_folder_url) {
                        window.open(job.drive_folder_url, '_blank')
                      } else {
                        setDriveUrlInput(job.drive_folder_url ?? '')
                        setEditingDriveUrl(true)
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      setDriveUrlInput(job.drive_folder_url ?? '')
                      setEditingDriveUrl(true)
                    }}
                    className="flex items-center gap-2.5 w-full transition-all"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '13px',
                      color: job.drive_folder_url ? '#8E8E93' : '#5A5A5E',
                    }}
                    onMouseEnter={(e) => { if (job.drive_folder_url) e.currentTarget.style.color = '#4A90D9' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = job.drive_folder_url ? '#8E8E93' : '#5A5A5E' }}
                  >
                    <svg className="w-[18px] h-[18px] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                      className="w-full focus:outline-none"
                      style={{
                        padding: '8px 12px', background: '#1A1A1D', border: '1px solid #2A2A2C',
                        borderRadius: '8px', fontSize: '12px', color: '#E5E5E7',
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveDriveUrl()
                        if (e.key === 'Escape') setEditingDriveUrl(false)
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveDriveUrl}
                        disabled={savingDriveUrl}
                        style={{
                          padding: '6px 14px', background: '#4A90D9', color: 'white',
                          fontSize: '12px', fontWeight: 600, borderRadius: '8px', border: 'none',
                          opacity: savingDriveUrl ? 0.5 : 1, cursor: savingDriveUrl ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {savingDriveUrl ? '...' : 'Salvar'}
                      </button>
                      {job.drive_folder_url && (
                        <a
                          href={job.drive_folder_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '12px', color: '#4A90D9' }}
                        >
                          Abrir
                        </a>
                      )}
                      <button
                        onClick={() => setEditingDriveUrl(false)}
                        style={{ fontSize: '12px', color: '#5A5A5E', marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* COMENTARIOS */}
            <div style={{ marginBottom: '28px' }}>
              <div className="flex items-center gap-2" style={{ fontSize: '11px', fontWeight: 600, color: '#5A5A5E', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>
                <span>Comentarios</span>
                <span
                  className="flex items-center justify-center"
                  style={{
                    fontSize: '10px', fontWeight: 700, color: 'white',
                    background: '#4A90D9', borderRadius: '9999px',
                    minWidth: '20px', height: '18px', padding: '0 6px',
                  }}
                >
                  {comentarios.length}
                </span>
              </div>

              <div>
                {loadingComments ? (
                  <p style={{ fontSize: '12px', color: '#5A5A5E', fontStyle: 'italic' }}>Carregando...</p>
                ) : comentarios.length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#5A5A5E', fontStyle: 'italic' }}>
                    Nenhum comentario ainda.
                  </p>
                ) : null}

                {comentarios.map((c) => (
                  <div
                    key={c.id}
                    style={{ padding: '12px 0', borderBottom: '1px solid #2A2A2C' }}
                  >
                    <div className="flex items-center gap-2" style={{ marginBottom: '6px' }}>
                      {/* Avatar circle */}
                      <div
                        className="flex items-center justify-center flex-shrink-0"
                        style={{
                          width: '24px', height: '24px', borderRadius: '9999px',
                          background: '#252528', color: '#8E8E93',
                          fontWeight: 700, fontSize: '10px',
                        }}
                      >
                        {(c.autor?.nome ?? 'M').charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#E5E5E7' }}>
                        {c.autor?.nome ?? 'Membro'}
                      </span>
                      <span style={{ fontSize: '11px', color: '#5A5A5E', marginLeft: 'auto', flexShrink: 0 }}>
                        {relativeTime(c.created_at)}
                      </span>
                      {/* Resolve checkbox */}
                      <button
                        onClick={() => toggleResolvido(c.id)}
                        className="flex items-center justify-center flex-shrink-0 transition-all"
                        style={{
                          width: '16px', height: '16px', borderRadius: '4px',
                          border: c.resolvido ? '2px solid #14AE5C' : '2px solid #3A3A3C',
                          background: c.resolvido ? '#14AE5C' : 'transparent',
                          color: c.resolvido ? 'white' : 'transparent',
                          cursor: 'pointer',
                        }}
                        title={c.resolvido ? 'Marcar como nao resolvido' : 'Marcar como resolvido'}
                      >
                        {c.resolvido && (
                          <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <p
                      style={{
                        fontSize: '13px', color: c.resolvido ? '#5A5A5E' : '#8E8E93',
                        lineHeight: 1.5, marginTop: '6px', marginLeft: '32px',
                        textDecoration: c.resolvido ? 'line-through' : 'none',
                      }}
                    >
                      {renderMentionText(c.texto)}
                    </p>
                  </div>
                ))}
              </div>

              {/* New comment form with @mention */}
              <form onSubmit={handleAddComment} className="relative" style={{ marginTop: '12px' }}>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    {/* Highlight overlay */}
                    <div
                      aria-hidden
                      className="absolute inset-0 pointer-events-none overflow-hidden whitespace-pre z-[1]"
                      style={{ padding: '10px 14px', fontSize: '13px' }}
                    >
                      {novoComentario.split(/(@\S+)/g).map((part, i) =>
                        part.startsWith('@') ? (
                          <span key={i} style={{ color: '#4A90D9', fontWeight: 500 }}>{part}</span>
                        ) : (
                          <span key={i} style={{ color: '#E5E5E7' }}>{part}</span>
                        )
                      )}
                    </div>
                    <input
                      ref={inputRef}
                      type="text"
                      value={novoComentario}
                      onChange={(e) => handleCommentInput(e.target.value)}
                      onKeyDown={handleCommentKeyDown}
                      placeholder="Escreva um comentario... @mencione"
                      className="w-full focus:outline-none"
                      style={{
                        padding: '10px 14px', background: '#111113', border: '1px solid #2A2A2C',
                        borderRadius: '8px', fontSize: '13px', color: 'transparent',
                        caretColor: '#E5E5E7', position: 'relative',
                      }}
                    />

                    {/* @mention dropdown */}
                    {showMentionDropdown && filteredMembros.length > 0 && (
                      <div
                        className="absolute bottom-full left-0 mb-1 w-full overflow-hidden z-50"
                        style={{ background: '#141416', border: '1px solid #2A2A2C', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}
                      >
                        {filteredMembros.map((m, i) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleMentionSelect(m)}
                            className="w-full text-left flex items-center gap-2 transition-colors"
                            style={{
                              padding: '8px 12px', fontSize: '12px',
                              background: i === mentionIndex ? 'rgba(74,144,217,0.15)' : 'transparent',
                              color: i === mentionIndex ? '#4A90D9' : '#E5E5E7',
                            }}
                          >
                            <span
                              className="flex items-center justify-center"
                              style={{
                                width: '20px', height: '20px', borderRadius: '6px',
                                background: 'rgba(74,144,217,0.2)', color: '#4A90D9',
                                fontSize: '9px', fontWeight: 700,
                              }}
                            >
                              {m.nome.charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <span style={{ fontWeight: 500 }}>{m.nome}</span>
                              <span style={{ fontSize: '10px', color: '#5A5A5E', marginLeft: '6px' }}>{m.email}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={!novoComentario.trim() || sendingComment}
                    style={{
                      padding: '10px 16px', background: '#4A90D9', color: 'white',
                      border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                      cursor: (!novoComentario.trim() || sendingComment) ? 'not-allowed' : 'pointer',
                      opacity: (!novoComentario.trim() || sendingComment) ? 0.4 : 1,
                      flexShrink: 0,
                    }}
                  >
                    {sendingComment ? '...' : 'Enviar'}
                  </button>
                </div>
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
        <span key={i} style={{ color: '#4A90D9', fontWeight: 500 }}>
          {part}
        </span>
      )
    }
    return part
  })
}
