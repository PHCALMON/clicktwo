'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import type { Profile, Job, StatusMembro } from '@/lib/types'
import { STATUS_MEMBRO } from '@/lib/constants'

interface TeamStatusBarProps {
  membros: Profile[]
  jobs: Job[]
  currentUserId: string
  onStatusChange: (status: StatusMembro, texto?: string) => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `ha ${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `ha ${hours}h`
  const days = Math.floor(hours / 24)
  return `ha ${days}d`
}

export function TeamStatusBar({ membros, jobs, currentUserId, onStatusChange }: TeamStatusBarProps) {
  const [openDropdown, setOpenDropdown] = useState(false)
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null)
  const [estudandoInput, setEstudandoInput] = useState('')
  const [showEstudandoInput, setShowEstudandoInput] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Map: memberId -> job they're producing
  const producaoMap = useMemo(() => {
    const map = new Map<string, Job>()
    for (const job of jobs) {
      if (job.em_producao_por) {
        map.set(job.em_producao_por, job)
      }
    }
    return map
  }, [jobs])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(false)
        setShowEstudandoInput(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleStatusSelect(status: StatusMembro) {
    if (status === 'estudando') {
      setShowEstudandoInput(true)
      return
    }
    onStatusChange(status)
    setOpenDropdown(false)
    setShowEstudandoInput(false)
  }

  function handleEstudandoSubmit() {
    onStatusChange('estudando', estudandoInput.trim() || undefined)
    setOpenDropdown(false)
    setShowEstudandoInput(false)
    setEstudandoInput('')
  }

  function handleMouseEnter(membroId: string) {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => setHoveredMemberId(membroId), 300)
  }

  function handleMouseLeave() {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => setHoveredMemberId(null), 150)
  }

  return (
    <div className="flex items-center gap-2 px-6 py-2 border-b border-border bg-bg-secondary/50">
      <span className="text-xs text-text-muted font-medium mr-1">Equipe</span>
      {membros.map((membro) => {
        const statusInfo = STATUS_MEMBRO[membro.status] ?? STATUS_MEMBRO.livre
        const isMe = membro.id === currentUserId
        const initial = membro.nome?.charAt(0)?.toUpperCase() ?? '?'
        const isHovered = hoveredMemberId === membro.id
        const jobAtivo = producaoMap.get(membro.id)

        if (isMe) {
          return (
            <div key={membro.id} className="relative" ref={dropdownRef}>
              <button
                onClick={() => setOpenDropdown(!openDropdown)}
                onMouseEnter={() => handleMouseEnter(membro.id)}
                onMouseLeave={handleMouseLeave}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border-2 hover:bg-bg-tertiary"
                style={{ borderColor: statusInfo.color, color: statusInfo.color }}
                title="Trocar status"
              >
                <span className="w-5 h-5 rounded-full bg-accent/20 text-accent text-[10px] font-bold flex items-center justify-center">
                  {initial}
                </span>
                <span className="text-text-primary">{membro.nome?.split(' ')[0]}</span>
                <span>{statusInfo.emoji}</span>
              </button>

              {/* Tooltip */}
              {isHovered && !openDropdown && (
                <div
                  className="absolute top-full mt-2 left-0 bg-bg-elevated border border-border rounded-lg shadow-elevated z-50 p-3 min-w-[220px]"
                  onMouseEnter={() => handleMouseEnter(membro.id)}
                  onMouseLeave={handleMouseLeave}
                >
                  <p className="text-sm font-semibold text-text-primary">{membro.nome}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span>{statusInfo.emoji}</span>
                    <span className="text-xs font-medium" style={{ color: statusInfo.color }}>{statusInfo.label}</span>
                    <span className="text-xs text-text-muted">{timeAgo(membro.status_updated_at)}</span>
                  </div>
                  {membro.status === 'producao' && jobAtivo && (
                    <p className="text-xs text-text-secondary mt-1.5">
                      Fazendo: <span className="font-medium text-accent">{jobAtivo.campanha}</span>
                      {jobAtivo.cliente && <span className="text-text-muted"> ({jobAtivo.cliente.nome})</span>}
                    </p>
                  )}
                  {membro.status === 'estudando' && membro.status_texto && (
                    <p className="text-xs text-text-secondary mt-1.5">
                      Estudando: <span className="font-medium text-blue-400">{membro.status_texto}</span>
                    </p>
                  )}
                </div>
              )}

              {openDropdown && (
                <div className="absolute top-full mt-1 left-0 bg-bg-elevated border border-border rounded-lg shadow-elevated z-50 py-1 min-w-[220px]">
                  {(Object.entries(STATUS_MEMBRO) as [StatusMembro, typeof statusInfo][]).map(([key, info]) => (
                    <button
                      key={key}
                      onClick={() => handleStatusSelect(key)}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors hover:bg-bg-tertiary ${
                        membro.status === key ? 'text-accent font-semibold' : 'text-text-primary'
                      }`}
                    >
                      <span>{info.emoji}</span>
                      <span>{info.label}</span>
                    </button>
                  ))}
                  {showEstudandoInput && (
                    <div className="px-3 py-2 border-t border-border">
                      <input
                        type="text"
                        value={estudandoInput}
                        onChange={(e) => setEstudandoInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEstudandoSubmit()
                          if (e.key === 'Escape') { setShowEstudandoInput(false); setOpenDropdown(false) }
                        }}
                        placeholder="Estudando o que? (ex: After Effects)"
                        autoFocus
                        className="w-full px-2 py-1.5 bg-bg-card border border-border rounded text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
                      />
                      <button
                        onClick={handleEstudandoSubmit}
                        className="mt-1.5 w-full py-1.5 bg-accent text-bg-primary text-xs font-semibold rounded hover:bg-accent-hover transition-colors"
                      >
                        Confirmar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        }

        return (
          <div
            key={membro.id}
            className="relative"
            onMouseEnter={() => handleMouseEnter(membro.id)}
            onMouseLeave={handleMouseLeave}
          >
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border cursor-default"
              style={{ borderColor: statusInfo.color + '40' }}
            >
              <span className="w-5 h-5 rounded-full bg-bg-tertiary text-text-secondary text-[10px] font-bold flex items-center justify-center">
                {initial}
              </span>
              <span className="text-text-secondary">{membro.nome?.split(' ')[0]}</span>
              <span>{statusInfo.emoji}</span>
            </div>

            {/* Tooltip */}
            {isHovered && (
              <div
                className="absolute top-full mt-2 left-0 bg-bg-elevated border border-border rounded-lg shadow-elevated z-50 p-3 min-w-[220px]"
                onMouseEnter={() => handleMouseEnter(membro.id)}
                onMouseLeave={handleMouseLeave}
              >
                <p className="text-sm font-semibold text-text-primary">{membro.nome}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span>{statusInfo.emoji}</span>
                  <span className="text-xs font-medium" style={{ color: statusInfo.color }}>{statusInfo.label}</span>
                  <span className="text-xs text-text-muted">{timeAgo(membro.status_updated_at)}</span>
                </div>
                {membro.status === 'producao' && jobAtivo && (
                  <p className="text-xs text-text-secondary mt-1.5">
                    Fazendo: <span className="font-medium text-accent">{jobAtivo.campanha}</span>
                    {jobAtivo.cliente && <span className="text-text-muted"> ({jobAtivo.cliente.nome})</span>}
                  </p>
                )}
                {membro.status === 'estudando' && membro.status_texto && (
                  <p className="text-xs text-text-secondary mt-1.5">
                    Estudando: <span className="font-medium text-blue-400">{membro.status_texto}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
