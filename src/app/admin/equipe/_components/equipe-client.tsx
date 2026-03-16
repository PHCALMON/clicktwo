'use client'

import { useState } from 'react'
import type { Profile, Cargo, PersonalidadeResult } from '@/lib/types'
import { CARGOS } from '@/lib/constants'
import { ARQUETIPOS } from '@/lib/arquetipos'

interface EquipeClientProps {
  membros: Profile[]
}

export function EquipeClient({ membros: initial }: EquipeClientProps) {
  const [membros, setMembros] = useState(initial)
  const [saving, setSaving] = useState<string | null>(null)

  async function setCargo(membroId: string, cargo: Cargo | null) {
    setSaving(membroId)
    try {
      const res = await fetch(`/api/membros/${membroId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cargo }),
      })
      if (res.ok) {
        setMembros((prev) =>
          prev.map((m) => m.id === membroId ? { ...m, cargo } : m)
        )
      }
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-text-primary">Equipe</h1>
          <p className="text-sm text-text-muted mt-1">Defina o cargo de cada membro</p>
        </div>

        <div className="space-y-3">
          {membros.map((membro) => {
            const personalidade = membro.personalidade as PersonalidadeResult | null
            const arq = personalidade ? ARQUETIPOS[personalidade.tipo] : null
            const firstName = membro.nome?.split(' ')[0] || membro.email?.split('@')[0] || '?'
            const currentCargo = membro.cargo as Cargo | null
            const cargoInfo = currentCargo ? CARGOS[currentCargo] : null
            const isSaving = saving === membro.id

            return (
              <div key={membro.id} className="bg-bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-4 mb-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-accent/20 text-accent text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {firstName.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-text-primary">{membro.nome || membro.email}</h3>
                      {cargoInfo && (
                        <span
                          className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${cargoInfo.color}15`, color: cargoInfo.color }}
                        >
                          {cargoInfo.icon} {cargoInfo.label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted truncate">{membro.email}</p>
                  </div>

                  {/* Personality badge */}
                  {arq && personalidade && (
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0"
                      style={{ backgroundColor: `${personalidade.cor}15`, color: personalidade.cor }}
                    >
                      <span>{arq.icone}</span>
                      <span>{personalidade.arquetipo}</span>
                    </div>
                  )}
                </div>

                {/* Cargo selector */}
                <div className="flex flex-wrap gap-1.5">
                  {(Object.entries(CARGOS) as [Cargo, { label: string; color: string; icon: string }][]).map(([key, cfg]) => {
                    const isActive = currentCargo === key
                    return (
                      <button
                        key={key}
                        onClick={() => setCargo(membro.id, isActive ? null : key)}
                        disabled={isSaving}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 ${
                          isActive
                            ? 'border-2'
                            : 'border border-border bg-[#1C1C1E] hover:border-border-hover hover:bg-bg-hover'
                        }`}
                        style={isActive ? {
                          borderColor: cfg.color,
                          backgroundColor: `${cfg.color}15`,
                          color: cfg.color,
                        } : undefined}
                      >
                        <span>{cfg.icon}</span>
                        <span className={isActive ? '' : 'text-text-muted'}>{cfg.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
