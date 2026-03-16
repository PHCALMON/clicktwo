'use client'

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import type { Job, Coluna, Comentario, Arquivo, Profile, Entrega, JobFreela, TagJob } from '@/lib/types'
import { TIPOS_JOB, TAGS } from '@/lib/constants'
import { calcPrioridade, calcJobPrioridade } from '@/lib/priority'
import { FileUpload } from './file-upload'
import { ClientLogo } from '@/components/ui/client-logo'

// ── STATIC STYLE CONSTANTS (extracted to avoid re-creation on every render) ──

const SECTION_TITLE_STYLE: React.CSSProperties = { fontSize: '11px', fontWeight: 600, color: '#5A5A5E', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }
const CARD_STYLE: React.CSSProperties = { background: '#1C1C1E', border: '1px solid #2A2A2C', borderRadius: '8px', padding: '14px' }
const INFO_ITEM_STYLE: React.CSSProperties = { background: '#1C1C1E', border: '1px solid #2A2A2C', borderRadius: '8px', padding: '12px' }
const LABEL_STYLE: React.CSSProperties = { fontSize: '10px', fontWeight: 600, color: '#5A5A5E', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }
const VALUE_STYLE: React.CSSProperties = { fontSize: '14px', fontWeight: 600, color: '#E5E5E7' }
const MODAL_OVERLAY_STYLE: React.CSSProperties = { background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }
const MODAL_CONTAINER_STYLE: React.CSSProperties = {
  background: '#141416', border: '1px solid #2A2A2C', borderRadius: '12px',
  boxShadow: '0 24px 80px rgba(0,0,0,0.5)', overflow: 'hidden',
}
const HEADER_STYLE: React.CSSProperties = { padding: '20px 28px', borderBottom: '1px solid #2A2A2C' }
const LEFT_COL_STYLE: React.CSSProperties = { padding: '24px 28px', borderRight: '1px solid #2A2A2C' }
const RIGHT_COL_STYLE: React.CSSProperties = { width: '300px', padding: '24px 20px' }
const BODY_STYLE: React.CSSProperties = { minHeight: '600px' }
const ICON_BTN_STYLE: React.CSSProperties = {
  width: '36px', height: '36px', borderRadius: '6px',
  border: '1px solid #2A2A2C', color: '#5A5A5E', background: 'none',
}
const SUBTITLE_STYLE: React.CSSProperties = { fontSize: '13px', color: '#8E8E93', marginTop: '2px' }
const BRIEFING_TEXTAREA_STYLE: React.CSSProperties = {
  padding: '12px', fontSize: '13px', color: '#E5E5E7',
  background: '#1C1C1E', border: '1px solid #2A2A2C', borderRadius: '8px',
  lineHeight: '1.5',
}
const COMMENT_AVATAR_STYLE: React.CSSProperties = {
  width: '24px', height: '24px', borderRadius: '9999px',
  background: '#252528', color: '#8E8E93',
  fontWeight: 700, fontSize: '10px',
}
const FREELA_AVATAR_STYLE: React.CSSProperties = {
  width: '36px', height: '36px', borderRadius: '9999px',
  background: 'rgba(255,140,0,0.15)', color: '#FF8C00',
  fontWeight: 700, fontSize: '14px',
}
const COMMENT_INPUT_STYLE: React.CSSProperties = {
  padding: '10px 14px', background: '#111113', border: '1px solid #2A2A2C',
  borderRadius: '8px', fontSize: '13px', color: 'transparent',
  caretColor: '#E5E5E7', position: 'relative',
}
const HIGHLIGHT_OVERLAY_STYLE: React.CSSProperties = { padding: '10px 14px', fontSize: '13px' }
const DROPDOWN_STYLE: React.CSSProperties = { background: '#141416', border: '1px solid #2A2A2C', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }
const TAG_PICKER_STYLE: React.CSSProperties = { background: '#141416', border: '1px solid #2A2A2C', borderRadius: '8px', padding: '8px', width: '208px', maxHeight: '288px', boxShadow: '0 12px 32px rgba(0,0,0,0.6)' }
const ENTREGA_TAG_PICKER_STYLE: React.CSSProperties = { background: '#141416', border: '1px solid #2A2A2C', borderRadius: '8px', padding: '6px', width: '176px', maxHeight: '240px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }
const ADD_ENTREGA_INPUT_STYLE: React.CSSProperties = { fontSize: '13px', color: '#5A5A5E', background: 'transparent', border: 'none', cursor: 'text' }
const FORM_FIELD_STYLE: React.CSSProperties = { padding: '4px 8px', background: '#1A1A1D', border: '1px solid #2A2A2C', borderRadius: '8px', fontSize: '11px', color: '#8E8E93' }
const SELECT_FIELD_STYLE: React.CSSProperties = { padding: '4px', background: '#1A1A1D', border: '1px solid #2A2A2C', borderRadius: '8px', fontSize: '11px', color: '#8E8E93' }
const ENTREGA_BORDER_STYLE: React.CSSProperties = { padding: '10px 0', borderBottom: '1px solid #2A2A2C', alignItems: 'flex-start' }
const COMMENT_BORDER_STYLE: React.CSSProperties = { padding: '12px 0', borderBottom: '1px solid #2A2A2C' }
const COMMENT_HEADER_STYLE: React.CSSProperties = { marginBottom: '6px' }
const SECTION_MB_STYLE: React.CSSProperties = { marginBottom: '28px' }
const GRID_GAP_STYLE: React.CSSProperties = { gap: '12px' }

// ── SUB-COMPONENTS (memoized) ──

interface EntregaItemProps {
  entrega: Entrega
  currentUserId: string
  membros: Profile[]
  editingEntregaTagId: string | null
  onToggleEntrega: (id: string) => void
  onToggleProduzindo: (id: string) => void
  onToggleAprovado: (id: string) => void
  onDeleteEntrega: (id: string) => void
  onSetEditingTagId: (id: string | null) => void
  onUpdateEntregaTag: (id: string, tag: TagJob | null) => void
  onUpdateEntregaDate: (id: string, date: string | null) => void
  onUpdateEntregaDeadline: (id: string, fields: { hora_entrega_cliente?: string | null; margem_horas?: number }) => void
}

const EntregaItem = memo(function EntregaItem({
  entrega, currentUserId, membros, editingEntregaTagId,
  onToggleEntrega, onToggleProduzindo, onToggleAprovado,
  onDeleteEntrega, onSetEditingTagId, onUpdateEntregaTag,
  onUpdateEntregaDate, onUpdateEntregaDeadline,
}: EntregaItemProps) {
  const ep = entrega.data_entrega ? calcPrioridade(entrega.data_entrega, entrega.hora_entrega_cliente, entrega.margem_horas) : null

  const produzindoNome = useMemo(() => {
    if (!entrega.produzindo_por || entrega.produzindo_por === currentUserId) return null
    const m = membros.find((mb) => mb.id === entrega.produzindo_por)
    return m?.nome?.split(' ')[0] ?? '...'
  }, [entrega.produzindo_por, currentUserId, membros])

  const aprovadoNome = useMemo(() => {
    if (!entrega.aprovado_interno) return null
    const m = membros.find((mb) => mb.id === entrega.aprovado_interno_por)
    return m?.nome?.split(' ')[0] ?? '...'
  }, [entrega.aprovado_interno, entrega.aprovado_interno_por, membros])

  return (
    <div className="flex gap-2.5" style={ENTREGA_BORDER_STYLE}>
      {/* Checkbox */}
      <button
        onClick={() => onToggleEntrega(entrega.id)}
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
        <div className="flex items-center gap-2">
          <div
            style={{
              fontSize: '13px', fontWeight: 500, flex: 1,
              color: entrega.concluida ? '#5A5A5E' : '#E5E5E7',
              textDecoration: entrega.concluida ? 'line-through' : 'none',
            }}
          >
            {entrega.nome}
          </div>
          {/* Produzindo esta entrega */}
          <button
            onClick={() => onToggleProduzindo(entrega.id)}
            title={entrega.produzindo_por === currentUserId ? 'Parar de produzir' : 'Estou nesta entrega'}
            className="flex items-center gap-1 flex-shrink-0 transition-all"
            style={{
              padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 600,
              background: entrega.produzindo_por === currentUserId ? 'rgba(20,174,92,0.12)' : 'transparent',
              border: entrega.produzindo_por === currentUserId ? '1px solid rgba(20,174,92,0.3)' : '1px dashed #2A2A2C',
              color: entrega.produzindo_por === currentUserId ? '#14AE5C' : '#5A5A5E',
              cursor: 'pointer',
            }}
          >
            {entrega.produzindo_por === currentUserId ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#14AE5C' }} />
                Eu
              </>
            ) : entrega.produzindo_por ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#FF8C00' }} />
                {produzindoNome}
              </>
            ) : (
              'Pegar'
            )}
          </button>
          {/* Aprovar interno */}
          <button
            onClick={() => onToggleAprovado(entrega.id)}
            title={entrega.aprovado_interno
              ? `Aprovado por ${aprovadoNome}`
              : 'Aprovar entrega'}
            className="flex items-center gap-1 flex-shrink-0 transition-all"
            style={{
              padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 600,
              background: entrega.aprovado_interno ? 'rgba(20,174,92,0.12)' : 'transparent',
              border: entrega.aprovado_interno ? '1px solid rgba(20,174,92,0.3)' : '1px solid rgba(139,92,246,0.3)',
              color: entrega.aprovado_interno ? '#14AE5C' : '#8B5CF6',
              cursor: 'pointer',
            }}
          >
            {entrega.aprovado_interno ? (
              <>
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                {'Aprovado'}
              </>
            ) : (
              <>
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                {'Aprovar'}
              </>
            )}
          </button>
        </div>
        {/* Meta row: tag + deadline */}
        <div className="flex items-center gap-2" style={{ marginTop: '4px' }}>
          {/* Tag badge */}
          <div className="relative">
            <button
              onClick={() => onSetEditingTagId(editingEntregaTagId === entrega.id ? null : entrega.id)}
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
                <div className="fixed inset-0 z-40" onClick={() => onSetEditingTagId(null)} />
                <div className="absolute left-0 top-full mt-1 z-50 overflow-y-auto" style={ENTREGA_TAG_PICKER_STYLE}>
                  <button
                    onClick={() => onUpdateEntregaTag(entrega.id, null)}
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
                        onClick={() => onUpdateEntregaTag(entrega.id, value)}
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
              onChange={(e) => onUpdateEntregaDate(entrega.id, e.target.value || null)}
              className="focus:outline-none [color-scheme:dark]"
              style={{ width: '90px', fontSize: '10px', fontWeight: 600, color: '#5A5A5E', background: 'transparent', border: 'none' }}
            />
            <input
              type="time"
              value={entrega.hora_entrega_cliente ?? ''}
              onChange={(e) => onUpdateEntregaDeadline(entrega.id, { hora_entrega_cliente: e.target.value || null })}
              className="focus:outline-none [color-scheme:dark]"
              style={{ width: '60px', fontSize: '10px', fontWeight: 600, color: '#5A5A5E', background: 'transparent', border: 'none' }}
              title="Hora do cliente"
            />
            <select
              value={String(entrega.margem_horas ?? 4)}
              onChange={(e) => onUpdateEntregaDeadline(entrega.id, { margem_horas: parseInt(e.target.value) })}
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
        onClick={() => onDeleteEntrega(entrega.id)}
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
})

interface CommentItemProps {
  comment: Comentario
  onToggleResolvido: (id: string) => void
  relativeTime: (dateStr: string) => string
}

const CommentItem = memo(function CommentItem({ comment: c, onToggleResolvido, relativeTime }: CommentItemProps) {
  return (
    <div style={COMMENT_BORDER_STYLE}>
      <div className="flex items-center gap-2" style={COMMENT_HEADER_STYLE}>
        {/* Avatar circle */}
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={COMMENT_AVATAR_STYLE}
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
          onClick={() => onToggleResolvido(c.id)}
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
  )
})

interface FreelaItemProps {
  freela: JobFreela
  onDelete: (id: string) => void
}

const FreelaItem = memo(function FreelaItem({ freela, onDelete }: FreelaItemProps) {
  return (
    <div
      className="group flex items-center"
      style={{ gap: '12px', padding: '10px 0', borderBottom: '1px solid #2A2A2C' }}
    >
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={FREELA_AVATAR_STYLE}
      >
        {freela.nome.substring(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div style={VALUE_STYLE}>{freela.nome}</div>
        {freela.funcao && (
          <div style={{ fontSize: '12px', color: '#FF8C00' }}>{freela.funcao}</div>
        )}
      </div>
      <button
        onClick={() => onDelete(freela.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        style={{ background: 'none', border: 'none', color: '#5A5A5E', cursor: 'pointer', padding: '4px' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#FF453A' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#5A5A5E' }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
})

// ── MAIN COMPONENT ──

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
  // Freelas state (multiple per job)
  const [freelas, setFreelas] = useState<JobFreela[]>([])
  const [novaFreelaNome, setNovaFreelaNome] = useState('')
  const [novaFreelaFuncao, setNovaFreelaFuncao] = useState('')
  const [addingFreela, setAddingFreela] = useState(false)
  const [loadingComments, setLoadingComments] = useState(true)
  const [sendingComment, setSendingComment] = useState(false)

  // Lazy-load flags
  const [commentsReady, setCommentsReady] = useState(false)
  const [filesReady, setFilesReady] = useState(false)

  // Entregas error state
  const [entregaError, setEntregaError] = useState<string | null>(null)

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
  const [briefing, setBriefing] = useState(job.briefing_texto ?? '')
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

  // ── LAZY LOAD: comments section loads 500ms after mount, files after 300ms ──
  useEffect(() => {
    const commentsTimer = setTimeout(() => setCommentsReady(true), 500)
    const filesTimer = setTimeout(() => setFilesReady(true), 300)
    return () => {
      clearTimeout(commentsTimer)
      clearTimeout(filesTimer)
    }
  }, [])

  // Sync entregas back to parent job for priority recalculation
  useEffect(() => {
    onUpdate({ ...job, entregas })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entregas])

  // Load comments + members on mount
  useEffect(() => {
    async function loadData() {
      const [commentsRes, membrosRes, entregasRes, freelasRes] = await Promise.all([
        fetch(`/api/jobs/${job.id}/comentarios`),
        fetch('/api/membros'),
        fetch(`/api/jobs/${job.id}/entregas`),
        fetch(`/api/jobs/${job.id}/freelas`),
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
      if (freelasRes.ok) {
        const data = await freelasRes.json()
        setFreelas(data)
      }
      setLoadingComments(false)
    }
    loadData()
  }, [job.id])

  // ── MEMOIZED CALLBACKS ──

  const handleAddFreela = useCallback(async () => {
    if (!novaFreelaNome.trim() || addingFreela) return
    setAddingFreela(true)
    try {
      const res = await fetch(`/api/jobs/${job.id}/freelas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novaFreelaNome.trim(), funcao: novaFreelaFuncao.trim() || null }),
      })
      if (res.ok) {
        const freela = await res.json()
        setFreelas((prev) => [...prev, freela])
        setNovaFreelaNome('')
        setNovaFreelaFuncao('')
      }
    } catch { /* silent */ }
    setAddingFreela(false)
  }, [novaFreelaNome, novaFreelaFuncao, addingFreela, job.id])

  const handleDeleteFreela = useCallback(async (freelaId: string) => {
    try {
      const res = await fetch(`/api/jobs/${job.id}/freelas?freela_id=${freelaId}`, { method: 'DELETE' })
      if (res.ok) {
        setFreelas((prev) => prev.filter((f) => f.id !== freelaId))
      }
    } catch { /* silent */ }
  }, [job.id])

  const handleSaveDriveUrl = useCallback(async () => {
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
  }, [job, driveUrlInput, onUpdate])

  const handleAddComment = useCallback(async (e: React.FormEvent) => {
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
  }, [novoComentario, sendingComment, mentionedIds, job.id])

  const toggleResolvido = useCallback(async (commentId: string) => {
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
  }, [comentarios, job.id])

  const handleAddEntrega = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('[entregas] handleAddEntrega called', { jobId: job.id, nome: novaEntregaNome })
    if (!novaEntregaNome.trim() || addingEntrega) return
    setAddingEntrega(true)
    setEntregaError(null)
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
      console.log('[entregas] Response status:', res.status)
      if (res.ok) {
        const created = await res.json()
        setEntregas((prev) => [...prev, created])
        setNovaEntregaNome('')
        setNovaEntregaTag('')
        setNovaEntregaData('')
        setNovaEntregaHora('')
        setNovaEntregaMargem('4')
      } else {
        const errText = await res.text()
        console.error('[entregas] Erro ao criar:', res.status, errText)
        setEntregaError(`Erro ${res.status}: ${errText || 'Falha ao criar entrega'}`)
      }
    } catch (err) {
      console.error('[entregas] Erro de rede:', err)
      setEntregaError(`Erro de rede: ${err instanceof Error ? err.message : 'Falha na conexao'}`)
    } finally {
      setAddingEntrega(false)
    }
  }, [job.id, novaEntregaNome, novaEntregaTag, novaEntregaData, novaEntregaHora, novaEntregaMargem, addingEntrega])

  const toggleEntrega = useCallback(async (entregaId: string) => {
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
  }, [entregas, job.id])

  const deleteEntrega = useCallback(async (entregaId: string) => {
    setEntregas((prev) => prev.filter((e) => e.id !== entregaId))
    try {
      await fetch(`/api/jobs/${job.id}/entregas?entrega_id=${entregaId}`, { method: 'DELETE' })
    } catch { /* silent */ }
  }, [job.id])

  const toggleJobTag = useCallback(async (tag: TagJob) => {
    const next = job.tags.includes(tag)
      ? job.tags.filter((t) => t !== tag)
      : [...job.tags, tag]
    onUpdate({ ...job, tags: next })
    await fetch(`/api/jobs/${job.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: next }),
    })
  }, [job, onUpdate])

  const handleSaveJobDeadline = useCallback(async (field: 'hora_entrega_cliente' | 'margem_horas', value: string) => {
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
  }, [job, onUpdate])

  const updateEntregaDeadline = useCallback(async (entregaId: string, fields: { hora_entrega_cliente?: string | null; margem_horas?: number }) => {
    setEntregas((prev) => prev.map((e) => e.id === entregaId ? { ...e, ...fields } : e))
    await fetch(`/api/jobs/${job.id}/entregas`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entrega_id: entregaId, ...fields }),
    })
  }, [job.id])

  const toggleEntregaProduzindo = useCallback(async (entregaId: string) => {
    const entrega = entregas.find((e) => e.id === entregaId)
    if (!entrega) return
    const newValue = entrega.produzindo_por === currentUserId ? null : currentUserId
    setEntregas((prev) => prev.map((e) => e.id === entregaId ? { ...e, produzindo_por: newValue } : e))
    await fetch(`/api/jobs/${job.id}/entregas`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entrega_id: entregaId, produzindo_por: newValue }),
    })
  }, [entregas, currentUserId, job.id])

  const toggleAprovadoInterno = useCallback(async (entregaId: string) => {
    const entrega = entregas.find((e) => e.id === entregaId)
    if (!entrega) return
    const newAprovado = !entrega.aprovado_interno
    const newAprovadoPor = newAprovado ? currentUserId : null
    setEntregas((prev) => prev.map((e) => e.id === entregaId ? { ...e, aprovado_interno: newAprovado, aprovado_interno_por: newAprovadoPor } : e))
    await fetch(`/api/jobs/${job.id}/entregas`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entrega_id: entregaId, aprovado_interno: newAprovado, aprovado_interno_por: newAprovadoPor }),
    })
  }, [entregas, currentUserId, job.id])

  const updateEntregaDate = useCallback(async (entregaId: string, data_entrega: string | null) => {
    setEntregas((prev) => prev.map((e) => e.id === entregaId ? { ...e, data_entrega } : e))
    await fetch(`/api/jobs/${job.id}/entregas`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entrega_id: entregaId, data_entrega }),
    })
  }, [job.id])

  const updateEntregaTag = useCallback(async (entregaId: string, tag: TagJob | null) => {
    setEntregas((prev) => prev.map((e) => e.id === entregaId ? { ...e, tag } : e))
    setEditingEntregaTagId(null)
    await fetch(`/api/jobs/${job.id}/entregas`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entrega_id: entregaId, tag }),
    })
  }, [job.id])

  const handleMoveColumn = useCallback(async (newColunaId: string) => {
    onUpdate({ ...job, coluna_id: newColunaId })
    await fetch(`/api/jobs/${job.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coluna_id: newColunaId }),
    })
  }, [job, onUpdate])

  const handleFileUpload = useCallback((arquivo: Arquivo) => {
    setArquivos((prev) => [...prev, arquivo])
  }, [])

  const handleFileDelete = useCallback((arquivoId: string) => {
    setArquivos((prev) => prev.filter((a) => a.id !== arquivoId))
  }, [])

  // @mention input handler
  const handleCommentInput = useCallback((value: string) => {
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
  }, [])

  const handleMentionSelect = useCallback((membro: Profile) => {
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
  }, [novoComentario, mentionStartPos])

  const handleCommentKeyDown = useCallback((e: React.KeyboardEvent) => {
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
  }, [showMentionDropdown, membros, mentionFilter, mentionIndex, handleMentionSelect])

  const handleClose = useCallback(async () => {
    const trimmedBriefing = briefing.trim() || null
    if (trimmedBriefing !== (job.briefing_texto ?? null)) {
      onUpdate({ ...job, briefing_texto: trimmedBriefing })
      fetch(`/api/jobs/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ briefing_texto: trimmedBriefing }),
      })
    }
    onClose()
  }, [briefing, job, onUpdate, onClose])

  // ── MEMOIZED COMPUTED VALUES ──

  const filteredMembros = useMemo(() =>
    membros.filter((m) => m.nome.toLowerCase().includes(mentionFilter)),
    [membros, mentionFilter]
  )

  const formattedDate = useMemo(() =>
    job.data_entrega
      ? new Date(job.data_entrega + 'T00:00:00').toLocaleDateString('pt-BR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'Sem data',
    [job.data_entrega]
  )

  const prio = useMemo(() =>
    calcJobPrioridade(job.data_entrega, entregas, job.hora_entrega_cliente, job.margem_horas),
    [job.data_entrega, entregas, job.hora_entrega_cliente, job.margem_horas]
  )

  const currentColuna = useMemo(() =>
    colunas.find((c) => c.id === job.coluna_id),
    [colunas, job.coluna_id]
  )

  const entregasConcluidas = useMemo(() =>
    entregas.filter((e) => e.concluida).length,
    [entregas]
  )

  const entregasAprovadas = useMemo(() =>
    entregas.filter((e) => e.aprovado_interno).length,
    [entregas]
  )

  // Compute internal deadline display
  const prazoInterno = useMemo(() => {
    if (!jobHora) return null
    const margem = parseInt(jobMargem) || 0
    if (margem === 0) return jobHora
    const [h, m] = jobHora.split(':').map(Number)
    const totalMin = h * 60 + m - margem * 60
    const ih = Math.floor(((totalMin % 1440) + 1440) % 1440 / 60)
    const im = ((totalMin % 1440) + 1440) % 1440 % 60
    return `${String(ih).padStart(2, '0')}:${String(im).padStart(2, '0')}`
  }, [jobHora, jobMargem])

  const relativeTime = useCallback((dateStr: string) => {
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
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={MODAL_OVERLAY_STYLE}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-[880px] mx-4 flex flex-col max-h-[90vh]"
        style={MODAL_CONTAINER_STYLE}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div className="flex items-center justify-between" style={HEADER_STYLE}>
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <ClientLogo
              nome={job.cliente?.nome ?? 'Cliente'}
              dominio={job.cliente?.dominio}
              cor={job.cliente?.cor}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-white truncate" style={{ fontSize: '18px' }}>{job.campanha}</h2>
              <p style={SUBTITLE_STYLE}>
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
                style={ICON_BTN_STYLE}
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
                style={ICON_BTN_STYLE}
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
              onClick={handleClose}
              className="flex items-center justify-center transition-all"
              style={ICON_BTN_STYLE}
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
        <div className="flex flex-1 min-h-0" style={BODY_STYLE}>

          {/* ── LEFT COLUMN ── */}
          <div className="flex-1 overflow-y-auto" style={LEFT_COL_STYLE}>

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
            <div style={SECTION_MB_STYLE}>
              <div style={SECTION_TITLE_STYLE}>
                Informacoes
              </div>
              <div className="grid grid-cols-2" style={GRID_GAP_STYLE}>
                {/* Coluna */}
                <div style={INFO_ITEM_STYLE}>
                  <div style={LABEL_STYLE}>
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
                <div style={INFO_ITEM_STYLE}>
                  <div style={LABEL_STYLE}>
                    Tipo
                  </div>
                  <div style={VALUE_STYLE}>
                    {TIPOS_JOB[job.tipo_job]}
                  </div>
                </div>
                {/* Data Entrega */}
                <div style={INFO_ITEM_STYLE}>
                  <div style={LABEL_STYLE}>
                    Data Entrega
                  </div>
                  <div style={VALUE_STYLE}>
                    {formattedDate}
                  </div>
                </div>
                {/* Prazo do Cliente */}
                <div style={INFO_ITEM_STYLE}>
                  <div style={LABEL_STYLE}>
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
                <div style={{ ...INFO_ITEM_STYLE, gridColumn: '1 / -1' }}>
                  <div style={LABEL_STYLE}>
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

            {/* BRIEFING */}
            <div style={SECTION_MB_STYLE}>
              <div style={SECTION_TITLE_STYLE}>
                Briefing
              </div>
              <textarea
                value={briefing}
                onChange={(e) => setBriefing(e.target.value)}
                onBlur={async () => {
                  const trimmed = briefing.trim() || null
                  if (trimmed === (job.briefing_texto ?? null)) return
                  onUpdate({ ...job, briefing_texto: trimmed })
                  await fetch(`/api/jobs/${job.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ briefing_texto: trimmed }),
                  })
                }}
                placeholder="Descreva o briefing do job..."
                rows={4}
                className="w-full focus:outline-none resize-y"
                style={BRIEFING_TEXTAREA_STYLE}
              />
            </div>

            {/* FREELA */}
            <div style={SECTION_MB_STYLE}>
              <div className="flex items-center justify-between" style={SECTION_TITLE_STYLE}>
                <span>Freela</span>
                {freelas.length > 0 && (
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#FF8C00', letterSpacing: 'normal', textTransform: 'uppercase' }}>
                    {freelas.length}
                  </span>
                )}
              </div>

              {freelas.length > 0 && (
                <div>
                  {freelas.map((freela) => (
                    <FreelaItem key={freela.id} freela={freela} onDelete={handleDeleteFreela} />
                  ))}
                </div>
              )}

              {/* Add freela form */}
              <div className="flex items-center" style={{ gap: '8px', marginTop: freelas.length > 0 ? '8px' : '0' }}>
                <input
                  type="text"
                  value={novaFreelaNome}
                  onChange={(e) => setNovaFreelaNome(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddFreela() }}
                  placeholder="+ Adicionar freela"
                  className="flex-1 focus:outline-none"
                  style={{
                    padding: '10px 12px', fontSize: '13px', color: '#E5E5E7',
                    background: 'transparent', border: '1px dashed #2A2A2C', borderRadius: '8px',
                  }}
                />
                {novaFreelaNome.trim() && (
                  <>
                    <input
                      type="text"
                      value={novaFreelaFuncao}
                      onChange={(e) => setNovaFreelaFuncao(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddFreela() }}
                      placeholder="Funcao"
                      className="focus:outline-none"
                      style={{
                        padding: '10px 12px', fontSize: '13px', color: '#FF8C00',
                        background: 'transparent', border: '1px dashed #2A2A2C', borderRadius: '8px',
                        width: '140px',
                      }}
                    />
                    <button
                      onClick={handleAddFreela}
                      disabled={addingFreela}
                      className="flex items-center justify-center flex-shrink-0 transition-colors"
                      style={{
                        width: '36px', height: '36px', borderRadius: '8px',
                        background: '#0A84FF', color: 'white', border: 'none', cursor: 'pointer',
                        opacity: addingFreela ? 0.5 : 1,
                      }}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* ENTREGAS */}
            <div style={SECTION_MB_STYLE}>
              <div className="flex items-center justify-between" style={SECTION_TITLE_STYLE}>
                <span>Entregas</span>
                {entregas.length > 0 && (
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#14AE5C', letterSpacing: 'normal', textTransform: 'uppercase' }}>
                      {entregasConcluidas}/{entregas.length} concluidas
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#8B5CF6', letterSpacing: 'normal', textTransform: 'uppercase' }}>
                      {entregasAprovadas}/{entregas.length} aprovadas
                    </span>
                  </div>
                )}
              </div>

              {entregas.length > 0 && (
                <div>
                  {entregas.map((entrega) => (
                    <EntregaItem
                      key={entrega.id}
                      entrega={entrega}
                      currentUserId={currentUserId}
                      membros={membros}
                      editingEntregaTagId={editingEntregaTagId}
                      onToggleEntrega={toggleEntrega}
                      onToggleProduzindo={toggleEntregaProduzindo}
                      onToggleAprovado={toggleAprovadoInterno}
                      onDeleteEntrega={deleteEntrega}
                      onSetEditingTagId={setEditingEntregaTagId}
                      onUpdateEntregaTag={updateEntregaTag}
                      onUpdateEntregaDate={updateEntregaDate}
                      onUpdateEntregaDeadline={updateEntregaDeadline}
                    />
                  ))}
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
                  style={ADD_ENTREGA_INPUT_STYLE}
                />
                {novaEntregaNome.trim() && (
                  <>
                    <input
                      type="date"
                      value={novaEntregaData}
                      onChange={(e) => setNovaEntregaData(e.target.value)}
                      className="focus:outline-none [color-scheme:dark]"
                      style={FORM_FIELD_STYLE}
                      title="Data de entrega"
                    />
                    <input
                      type="time"
                      value={novaEntregaHora}
                      onChange={(e) => setNovaEntregaHora(e.target.value)}
                      className="focus:outline-none [color-scheme:dark]"
                      style={FORM_FIELD_STYLE}
                      title="Hora do cliente"
                    />
                    <select
                      value={novaEntregaMargem}
                      onChange={(e) => setNovaEntregaMargem(e.target.value)}
                      className="focus:outline-none"
                      style={SELECT_FIELD_STYLE}
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
                      style={FORM_FIELD_STYLE}
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
              {entregaError && (
                <div style={{ padding: '6px 10px', marginTop: '4px', fontSize: '12px', color: '#F24822', background: 'rgba(242,72,34,0.08)', border: '1px solid rgba(242,72,34,0.2)', borderRadius: '6px' }}>
                  {entregaError}
                </div>
              )}
            </div>

            {/* TAGS */}
            <div className="relative" style={SECTION_MB_STYLE}>
              <div style={SECTION_TITLE_STYLE}>
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
                  <div className="absolute left-0 top-full mt-1 z-50 overflow-y-auto" style={TAG_PICKER_STYLE}>
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

            {/* FILES (lazy loaded) */}
            <div style={SECTION_MB_STYLE}>
              <div style={SECTION_TITLE_STYLE}>
                Arquivos
              </div>
              {filesReady ? (
                <FileUpload
                  jobId={job.id}
                  arquivos={arquivos}
                  onUpload={handleFileUpload}
                  onDelete={handleFileDelete}
                />
              ) : (
                <p style={{ fontSize: '12px', color: '#5A5A5E', fontStyle: 'italic' }}>Carregando...</p>
              )}
            </div>

          </div>

          {/* ── RIGHT COLUMN (sidebar) ── */}
          <div className="flex-shrink-0 overflow-y-auto" style={RIGHT_COL_STYLE}>

            {/* STATUS */}
            <div style={SECTION_MB_STYLE}>
              <div style={SECTION_TITLE_STYLE}>
                Status
              </div>
              <div style={CARD_STYLE}>
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

            {/* PRE-ENVIO: Checagem + Link de Entrega */}
            {currentColuna?.slug === 'pre_envio' && (
              <div style={SECTION_MB_STYLE}>
                <div style={SECTION_TITLE_STYLE}>
                  Checagem Pre-Envio
                </div>
                <div style={{ ...CARD_STYLE, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Checagem Final */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={job.checagem_final ?? false}
                      onChange={async (e) => {
                        const val = e.target.checked
                        onUpdate({ ...job, checagem_final: val })
                        await fetch(`/api/jobs/${job.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ checagem_final: val }),
                        })
                      }}
                      className="w-4 h-4 rounded accent-green-500"
                    />
                    <span style={{ fontSize: '13px', color: job.checagem_final ? '#14AE5C' : '#8E8E93', fontWeight: 500 }}>
                      {job.checagem_final ? 'Checagem concluida ✓' : 'Marcar checagem final'}
                    </span>
                  </label>
                  {/* Link Entrega Cliente */}
                  <div>
                    <div style={{ fontSize: '10px', color: '#5A5A5E', marginBottom: '6px' }}>Link de entrega pro cliente</div>
                    {job.link_entrega_cliente ? (
                      <div className="flex items-center gap-2">
                        <a href={job.link_entrega_cliente} target="_blank" rel="noopener noreferrer" className="flex-1 truncate" style={{ fontSize: '12px', color: '#4A90D9' }}>
                          {job.link_entrega_cliente.replace(/^https?:\/\//, '').substring(0, 35)}
                        </a>
                        <button
                          onClick={async () => {
                            onUpdate({ ...job, link_entrega_cliente: null })
                            await fetch(`/api/jobs/${job.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ link_entrega_cliente: null }) })
                          }}
                          style={{ fontSize: '11px', color: '#5A5A5E', background: 'none', border: 'none', cursor: 'pointer' }}
                        >&times;</button>
                      </div>
                    ) : (
                      <input
                        type="url"
                        placeholder="Cole o link aqui..."
                        className="w-full focus:outline-none"
                        style={{ fontSize: '12px', color: '#E5E5E7', background: 'transparent', border: '1px dashed #3A3A3C', borderRadius: '6px', padding: '8px' }}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter') {
                            const val = (e.target as HTMLInputElement).value.trim()
                            if (!val) return
                            onUpdate({ ...job, link_entrega_cliente: val })
                            await fetch(`/api/jobs/${job.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ link_entrega_cliente: val }) })
                          }
                        }}
                        onBlur={async (e) => {
                          const val = e.target.value.trim()
                          if (!val) return
                          onUpdate({ ...job, link_entrega_cliente: val })
                          await fetch(`/api/jobs/${job.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ link_entrega_cliente: val }) })
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* GOOGLE DRIVE */}
            <div style={SECTION_MB_STYLE}>
              <div style={SECTION_TITLE_STYLE}>
                Google Drive
              </div>
              <div style={CARD_STYLE}>
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

            {/* COMENTARIOS (lazy loaded) */}
            {commentsReady ? (
              <div style={SECTION_MB_STYLE}>
                <div className="flex items-center gap-2" style={SECTION_TITLE_STYLE}>
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
                    <CommentItem
                      key={c.id}
                      comment={c}
                      onToggleResolvido={toggleResolvido}
                      relativeTime={relativeTime}
                    />
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
                        style={HIGHLIGHT_OVERLAY_STYLE}
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
                        style={COMMENT_INPUT_STYLE}
                      />

                      {/* @mention dropdown */}
                      {showMentionDropdown && filteredMembros.length > 0 && (
                        <div
                          className="absolute bottom-full left-0 mb-1 w-full overflow-hidden z-50"
                          style={DROPDOWN_STYLE}
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
            ) : (
              <div style={SECTION_MB_STYLE}>
                <div style={SECTION_TITLE_STYLE}>Comentarios</div>
                <p style={{ fontSize: '12px', color: '#5A5A5E', fontStyle: 'italic' }}>Carregando...</p>
              </div>
            )}
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
