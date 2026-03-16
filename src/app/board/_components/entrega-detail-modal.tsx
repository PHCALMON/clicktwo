'use client'

import { useState, useEffect, useRef } from 'react'
import type { EntregaWithJob, Profile, Comentario, TagJob } from '@/lib/types'
import { TAGS, TIPOS_JOB } from '@/lib/constants'
import { calcPrioridade } from '@/lib/priority'
import { ClientLogo } from '@/components/ui/client-logo'

interface EntregaDetailModalProps {
  entrega: EntregaWithJob
  currentUserId: string
  membros: Profile[]
  onClose: () => void
  onUpdate: (entrega: EntregaWithJob) => void
}

export function EntregaDetailModal({ entrega, currentUserId, membros, onClose, onUpdate }: EntregaDetailModalProps) {
  const job = entrega.job
  const [concluida, setConcluida] = useState(entrega.concluida)
  const [tag, setTag] = useState<TagJob | null>(entrega.tag)
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [aprovadoInterno, setAprovadoInterno] = useState(entrega.aprovado_interno)
  const [linkEntrega, setLinkEntrega] = useState(job?.link_entrega_cliente ?? '')
  const [savingLink, setSavingLink] = useState(false)

  // Comments (job-level)
  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [novoComentario, setNovoComentario] = useState('')
  const [loadingComments, setLoadingComments] = useState(true)
  const [sendingComment, setSendingComment] = useState(false)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  // Load comments on mount
  useEffect(() => {
    async function loadComments() {
      try {
        const res = await fetch(`/api/jobs/${job.id}/comentarios`)
        if (res.ok) {
          const data = await res.json()
          setComentarios(data)
        }
      } catch { /* silent */ }
      setLoadingComments(false)
    }
    loadComments()
  }, [job.id])

  // Scroll to bottom of comments when new one is added
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comentarios.length])

  async function saveEntregaField(fields: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/jobs/${job.id}/entregas`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entrega_id: entrega.id, ...fields }),
      })
      if (res.ok) {
        const updated = await res.json()
        onUpdate({ ...entrega, ...updated, job: entrega.job })
      }
    } catch { /* silent */ }
  }

  async function handleToggleConcluida() {
    const newValue = !concluida
    setConcluida(newValue)
    await saveEntregaField({ concluida: newValue })
  }

  async function handleTagChange(newTag: TagJob | null) {
    setTag(newTag)
    setShowTagPicker(false)
    await saveEntregaField({ tag: newTag })
  }

  async function handleToggleAprovadoInterno() {
    const newValue = !aprovadoInterno
    setAprovadoInterno(newValue)
    await saveEntregaField({
      aprovado_interno: newValue,
      aprovado_interno_por: newValue ? currentUserId : null,
    })
  }

  async function handleSaveLink() {
    setSavingLink(true)
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link_entrega_cliente: linkEntrega.trim() || null }),
      })
      if (res.ok) {
        // Update is job-level, just persist locally
      }
    } catch { /* silent */ }
    setSavingLink(false)
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault()
    if (!novoComentario.trim() || sendingComment) return
    setSendingComment(true)
    try {
      const res = await fetch(`/api/jobs/${job.id}/comentarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: novoComentario.trim(), mencoes: [] }),
      })
      if (res.ok) {
        const created = await res.json()
        setComentarios((prev) => [...prev, created])
        setNovoComentario('')
      }
    } catch { /* silent */ }
    setSendingComment(false)
  }

  function handleClose(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  // Priority calculation
  const prio = calcPrioridade(entrega.data_entrega, entrega.hora_entrega_cliente, entrega.margem_horas)

  // Column name from status_slug
  const statusLabel = entrega.status_slug?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? 'Backlog'

  // Who approved
  const aprovadoPor = aprovadoInterno
    ? membros.find((m) => m.id === entrega.aprovado_interno_por)?.nome ?? 'Membro'
    : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={handleClose}
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
              nome={job?.cliente?.nome ?? 'Cliente'}
              dominio={job?.cliente?.dominio}
              cor={job?.cliente?.cor}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-white truncate">{entrega.nome}</h2>
              <p className="text-sm text-[#8E8E93] truncate">
                {job?.campanha ?? 'Campanha'}
                {job?.cliente?.nome ? ` — ${job.cliente.nome}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#2A2A2C] transition-colors text-[#8E8E93] hover:text-white flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* ── BODY: LEFT + RIGHT ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT PANEL */}
          <div className="flex-1 overflow-y-auto" style={{ padding: '24px 28px' }}>
            {/* Tag */}
            <div className="mb-5 relative">
              <label className="text-[10px] font-semibold text-[#8E8E93] uppercase tracking-widest mb-1.5 block">Tag</label>
              <button
                onClick={() => setShowTagPicker(!showTagPicker)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors"
                style={{ background: '#1C1C1E', border: '1px solid #2A2A2C' }}
              >
                {tag ? (
                  <>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: TAGS[tag]?.color }} />
                    <span style={{ color: TAGS[tag]?.color }}>{TAGS[tag]?.label}</span>
                  </>
                ) : (
                  <span className="text-[#8E8E93]">Sem tag</span>
                )}
              </button>
              {showTagPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowTagPicker(false)} />
                  <div
                    className="absolute left-0 top-full mt-1 z-50 py-1 min-w-[180px]"
                    style={{ background: '#1C1C1E', border: '1px solid #2A2A2C', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
                  >
                    <button
                      onClick={() => handleTagChange(null)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[#8E8E93] hover:bg-[#2A2A2C] transition-colors"
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#2A2A2C' }} />
                      Sem tag
                    </button>
                    {(Object.entries(TAGS) as [TagJob, { label: string; color: string }][]).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => handleTagChange(key)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-[#2A2A2C] transition-colors"
                        style={{ color: config.color }}
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: config.color }} />
                        {config.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Deadline info */}
            {entrega.data_entrega && (
              <div className="mb-5">
                <label className="text-[10px] font-semibold text-[#8E8E93] uppercase tracking-widest mb-1.5 block">Prazo</label>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full${prio.pulse ? ' animate-pulse' : ''}`} style={{ backgroundColor: prio.color }} />
                    <span className="text-sm font-medium" style={{ color: prio.color }}>
                      {prio.countdown ?? prio.label}
                    </span>
                  </div>
                  <span className="text-sm text-[#8E8E93]">
                    {new Date(entrega.data_entrega + 'T00:00:00').toLocaleDateString('pt-BR')}
                    {entrega.hora_entrega_cliente ? ` ${entrega.hora_entrega_cliente}` : ''}
                  </span>
                  {entrega.margem_horas != null && (
                    <span className="text-xs text-[#636366]">margem {entrega.margem_horas}h</span>
                  )}
                </div>
              </div>
            )}

            {/* Concluida checkbox */}
            <div className="mb-6">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div
                  className="w-5 h-5 rounded flex items-center justify-center transition-colors"
                  style={{
                    background: concluida ? '#14AE5C' : '#1C1C1E',
                    border: concluida ? 'none' : '2px solid #3A3A3C',
                  }}
                  onClick={handleToggleConcluida}
                >
                  {concluida && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm font-medium ${concluida ? 'text-[#14AE5C]' : 'text-white'} group-hover:opacity-80 transition-opacity`}>
                  {concluida ? 'Concluida' : 'Marcar como concluida'}
                </span>
              </label>
            </div>

            {/* ── Campanha (read-only) ── */}
            <div className="mb-6" style={{ borderTop: '1px solid #2A2A2C', paddingTop: '20px' }}>
              <label className="text-[10px] font-semibold text-[#8E8E93] uppercase tracking-widest mb-3 block">Campanha</label>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#636366] w-20 flex-shrink-0">Campanha</span>
                  <span className="text-sm text-white">{job?.campanha ?? '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#636366] w-20 flex-shrink-0">Tipo</span>
                  <span className="text-sm text-white">{job?.tipo_job ? TIPOS_JOB[job.tipo_job] : '—'}</span>
                </div>
                {job?.briefing_texto && (
                  <div>
                    <span className="text-xs text-[#636366] block mb-1">Briefing</span>
                    <p className="text-sm text-[#C7C7CC] leading-relaxed whitespace-pre-wrap">{job.briefing_texto}</p>
                  </div>
                )}
                {job?.drive_folder_url && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#636366] w-20 flex-shrink-0">Drive</span>
                    <a
                      href={job.drive_folder_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#0D99FF] hover:underline truncate"
                    >
                      Abrir pasta
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* ── Comments ── */}
            <div style={{ borderTop: '1px solid #2A2A2C', paddingTop: '20px' }}>
              <label className="text-[10px] font-semibold text-[#8E8E93] uppercase tracking-widest mb-3 block">
                Comentarios ({comentarios.length})
              </label>

              {loadingComments ? (
                <p className="text-sm text-[#636366]">Carregando...</p>
              ) : comentarios.length === 0 ? (
                <p className="text-sm text-[#636366] mb-3">Nenhum comentario ainda.</p>
              ) : (
                <div className="space-y-3 mb-4 max-h-[240px] overflow-y-auto pr-1">
                  {comentarios.map((c) => {
                    const autor = membros.find((m) => m.id === c.autor_id) ?? c.autor
                    return (
                      <div key={c.id} className="flex gap-2.5">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold text-white"
                          style={{ background: '#3A3A3C' }}
                        >
                          {(autor?.nome ?? '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white">{autor?.nome ?? 'Desconhecido'}</span>
                            <span className="text-[10px] text-[#636366]">
                              {new Date(c.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {c.resolvido && (
                              <span className="text-[10px] text-[#14AE5C] font-medium">resolvido</span>
                            )}
                          </div>
                          <p className="text-sm text-[#C7C7CC] leading-relaxed mt-0.5">{c.texto}</p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={commentsEndRef} />
                </div>
              )}

              {/* Add comment */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  value={novoComentario}
                  onChange={(e) => setNovoComentario(e.target.value)}
                  placeholder="Escrever comentario..."
                  className="flex-1 text-sm rounded-md px-3 py-2 outline-none placeholder:text-[#636366]"
                  style={{ background: '#1C1C1E', border: '1px solid #2A2A2C', color: '#F5F5F7' }}
                />
                <button
                  type="submit"
                  disabled={!novoComentario.trim() || sendingComment}
                  className="px-3 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-40"
                  style={{ background: '#0D99FF', color: 'white' }}
                >
                  {sendingComment ? '...' : 'Enviar'}
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div
            className="w-[240px] flex-shrink-0 overflow-y-auto"
            style={{ borderLeft: '1px solid #2A2A2C', padding: '24px 20px', background: '#18181A' }}
          >
            {/* Status */}
            <div className="mb-5">
              <label className="text-[10px] font-semibold text-[#8E8E93] uppercase tracking-widest mb-1.5 block">Status</label>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium"
                style={{ background: '#2A2A2C', color: '#F5F5F7' }}
              >
                {statusLabel}
              </span>
            </div>

            {/* Aprovacao Interna */}
            <div className="mb-5">
              <label className="text-[10px] font-semibold text-[#8E8E93] uppercase tracking-widest mb-1.5 block">Aprovacao Interna</label>
              <button
                onClick={handleToggleAprovadoInterno}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-colors"
                style={{
                  background: aprovadoInterno ? '#14AE5C20' : '#1C1C1E',
                  border: `1px solid ${aprovadoInterno ? '#14AE5C' : '#3A3A3C'}`,
                  color: aprovadoInterno ? '#14AE5C' : '#8E8E93',
                }}
              >
                {aprovadoInterno ? 'Aprovado \u2713' : 'Aprovar'}
              </button>
              {aprovadoPor && (
                <p className="text-[10px] text-[#636366] mt-1">por {aprovadoPor}</p>
              )}
            </div>

            {/* Checagem Final — only when pre_envio */}
            {entrega.status_slug === 'pre_envio' && (
              <div className="mb-5">
                <label className="text-[10px] font-semibold text-[#8E8E93] uppercase tracking-widest mb-1.5 block">Checagem Final</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={job?.checagem_final ?? false}
                    onChange={async () => {
                      const newVal = !(job?.checagem_final ?? false)
                      try {
                        await fetch(`/api/jobs/${job.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ checagem_final: newVal }),
                        })
                      } catch { /* silent */ }
                    }}
                    className="w-4 h-4 rounded accent-[#14AE5C]"
                  />
                  <span className="text-sm text-[#C7C7CC]">Checagem OK</span>
                </label>
              </div>
            )}

            {/* Link de Entrega — only when pre_envio or revisao_cliente */}
            {(entrega.status_slug === 'pre_envio' || entrega.status_slug === 'revisao_cliente') && (
              <div className="mb-5">
                <label className="text-[10px] font-semibold text-[#8E8E93] uppercase tracking-widest mb-1.5 block">Link de Entrega</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={linkEntrega}
                    onChange={(e) => setLinkEntrega(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 text-sm rounded-md px-2.5 py-1.5 outline-none placeholder:text-[#636366] min-w-0"
                    style={{ background: '#1C1C1E', border: '1px solid #2A2A2C', color: '#F5F5F7' }}
                  />
                  <button
                    onClick={handleSaveLink}
                    disabled={savingLink}
                    className="px-2 py-1.5 text-xs font-semibold rounded-md transition-colors"
                    style={{ background: '#2A2A2C', color: '#F5F5F7' }}
                  >
                    {savingLink ? '...' : 'OK'}
                  </button>
                </div>
              </div>
            )}

            {/* Aprovacao Cliente — only when revisao_cliente */}
            {entrega.status_slug === 'revisao_cliente' && (
              <div className="mb-5">
                <label className="text-[10px] font-semibold text-[#8E8E93] uppercase tracking-widest mb-1.5 block">Aprovacao Cliente</label>
                <button
                  onClick={async () => {
                    try {
                      await fetch(`/api/jobs/${job.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ aprovado_cliente: true }),
                      })
                    } catch { /* silent */ }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-colors"
                  style={{
                    background: job?.aprovado_cliente ? '#14AE5C20' : '#1C1C1E',
                    border: `1px solid ${job?.aprovado_cliente ? '#14AE5C' : '#3A3A3C'}`,
                    color: job?.aprovado_cliente ? '#14AE5C' : '#8E8E93',
                  }}
                >
                  {job?.aprovado_cliente ? 'Cliente Aprovou \u2713' : 'Marcar Aprovado'}
                </button>
              </div>
            )}

            {/* Produzindo por */}
            {entrega.produzindo_por && (
              <div className="mb-5">
                <label className="text-[10px] font-semibold text-[#8E8E93] uppercase tracking-widest mb-1.5 block">Produzindo Por</label>
                <span className="text-sm text-white">
                  {membros.find((m) => m.id === entrega.produzindo_por)?.nome ?? 'Membro'}
                </span>
              </div>
            )}

            {/* Entrega ID (debug helper) */}
            <div className="mt-auto pt-4" style={{ borderTop: '1px solid #2A2A2C' }}>
              <p className="text-[10px] text-[#3A3A3C] font-mono truncate" title={entrega.id}>
                {entrega.id.slice(0, 8)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
