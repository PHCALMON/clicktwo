'use client'

import { useState } from 'react'
import { NotesPanelContent } from './notes-panel'
import { TasksPanelContent } from './tasks-panel'
import { NotificationsPanelContent } from './notifications-panel'

type PanelId = 'notas' | 'tarefas' | 'notificacoes'

export function BottomDock() {
  const [active, setActive] = useState<PanelId | null>(null)
  const [counts, setCounts] = useState({ notas: 0, tarefas: 0, notificacoes: 0 })

  const toggle = (panel: PanelId) => setActive((a) => (a === panel ? null : panel))

  return (
    <>
      {/* Panels — always mounted, visible only when active */}
      <NotesPanelContent
        visible={active === 'notas'}
        onCountChange={(c) => setCounts((p) => ({ ...p, notas: c }))}
      />
      <TasksPanelContent
        visible={active === 'tarefas'}
        onCountChange={(c) => setCounts((p) => ({ ...p, tarefas: c }))}
      />
      <NotificationsPanelContent
        visible={active === 'notificacoes'}
        onCountChange={(c) => setCounts((p) => ({ ...p, notificacoes: c }))}
      />

      {/* Dock bar — always visible */}
      <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2">
        <DockPill
          active={active === 'notas'}
          onClick={() => toggle('notas')}
          count={counts.notas}
          label="Notas"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </DockPill>

        <DockPill
          active={active === 'tarefas'}
          onClick={() => toggle('tarefas')}
          count={counts.tarefas}
          label="Tarefas"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </DockPill>

        <DockPill
          active={active === 'notificacoes'}
          onClick={() => toggle('notificacoes')}
          count={counts.notificacoes}
          label="Notif"
          accentBadge
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </DockPill>
      </div>
    </>
  )
}

function DockPill({
  active,
  onClick,
  count,
  label,
  accentBadge,
  children,
}: {
  active: boolean
  onClick: () => void
  count: number
  label: string
  accentBadge?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition-all ${
        active
          ? 'bg-accent/15 border-accent text-accent shadow-lg'
          : 'bg-bg-elevated border-border text-text-primary hover:bg-bg-tertiary hover:border-accent/50'
      }`}
      title={label}
    >
      <span className={active ? 'text-accent' : 'text-text-secondary'}>{children}</span>
      <span className="hidden sm:inline">{label}</span>
      {count > 0 && (
        <span
          className={`min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center px-1 ${
            accentBadge
              ? 'bg-red-500 text-white'
              : 'bg-accent/20 text-accent'
          }`}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}
