'use client'

import { useState, useRef, useEffect } from 'react'
import type { Profile, StatusMembro } from '@/lib/types'
import { STATUS_MEMBRO } from '@/lib/constants'

interface TeamStatusBarProps {
  membros: Profile[]
  currentUserId: string
  onStatusChange: (status: StatusMembro) => void
}

export function TeamStatusBar({ membros, currentUserId, onStatusChange }: TeamStatusBarProps) {
  const [openDropdown, setOpenDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="flex items-center gap-2 px-6 py-2 border-b border-border bg-bg-secondary/50">
      <span className="text-xs text-text-muted font-medium mr-1">Equipe</span>
      {membros.map((membro) => {
        const statusInfo = STATUS_MEMBRO[membro.status] ?? STATUS_MEMBRO.livre
        const isMe = membro.id === currentUserId
        const initial = membro.nome?.charAt(0)?.toUpperCase() ?? '?'

        if (isMe) {
          return (
            <div key={membro.id} className="relative" ref={dropdownRef}>
              <button
                onClick={() => setOpenDropdown(!openDropdown)}
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

              {openDropdown && (
                <div className="absolute top-full mt-1 left-0 bg-bg-elevated border border-border rounded-lg shadow-elevated z-50 py-1 min-w-[180px]">
                  {(Object.entries(STATUS_MEMBRO) as [StatusMembro, typeof statusInfo][]).map(([key, info]) => (
                    <button
                      key={key}
                      onClick={() => {
                        onStatusChange(key)
                        setOpenDropdown(false)
                      }}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors hover:bg-bg-tertiary ${
                        membro.status === key ? 'text-accent font-semibold' : 'text-text-primary'
                      }`}
                    >
                      <span>{info.emoji}</span>
                      <span>{info.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        }

        return (
          <div
            key={membro.id}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
            style={{ borderColor: statusInfo.color + '40' }}
            title={`${membro.nome} - ${statusInfo.label}`}
          >
            <span className="w-5 h-5 rounded-full bg-bg-tertiary text-text-secondary text-[10px] font-bold flex items-center justify-center">
              {initial}
            </span>
            <span className="text-text-secondary">{membro.nome?.split(' ')[0]}</span>
            <span>{statusInfo.emoji}</span>
          </div>
        )
      })}
    </div>
  )
}
