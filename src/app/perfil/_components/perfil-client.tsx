'use client'

import { useState } from 'react'
import type { Profile, PersonalidadeResult, Cargo } from '@/lib/types'
import { ARQUETIPOS, CATEGORIA_NOMES } from '@/lib/arquetipos'
import { CARGOS } from '@/lib/constants'

interface PerfilClientProps {
  profile: Profile
}

export function PerfilClient({ profile }: PerfilClientProps) {
  const [nome, setNome] = useState(profile.nome ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const personalidade = profile.personalidade as PersonalidadeResult | null
  const arq = personalidade ? ARQUETIPOS[personalidade.tipo] : null
  const firstName = nome?.split(' ')[0] || profile.email?.split('@')[0] || ''

  async function handleSave() {
    if (!nome.trim()) return
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch(`/api/membros/${profile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim() }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto px-6 py-10 space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 rounded-full bg-accent/20 text-accent text-2xl font-bold flex items-center justify-center mx-auto">
            {firstName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{nome || profile.email}</h1>
            <p className="text-sm text-text-muted">{profile.email}</p>
          </div>
        </div>

        {/* Name edit */}
        <div className="bg-bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-[2px]">Como quer ser chamado</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Seu nome..."
              className="flex-1 px-4 py-2.5 bg-[#111113] border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
            />
            <button
              onClick={handleSave}
              disabled={saving || !nome.trim() || nome === profile.nome}
              className="px-5 py-2.5 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? '...' : saved ? 'Salvo!' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* Personality test */}
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-6 space-y-4">
            <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-[2px]">Arquetipo Criativo</h2>

            {personalidade && arq ? (
              /* Has result */
              <div className="space-y-4">
                <div
                  className="flex items-center gap-4 p-4 rounded-lg"
                  style={{ backgroundColor: `${personalidade.cor}12` }}
                >
                  <span className="text-4xl">{arq.icone}</span>
                  <div>
                    <h3 className="text-lg font-bold text-text-primary">{personalidade.arquetipo}</h3>
                    <p className="text-sm text-text-secondary">
                      {personalidade.tipo}{personalidade.identidade === 'assertivo' ? '-A' : '-T'} · {CATEGORIA_NOMES[personalidade.categoria]}
                    </p>
                  </div>
                  <span
                    className="ml-auto px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: `${personalidade.cor}20`, color: personalidade.cor }}
                  >
                    {CATEGORIA_NOMES[personalidade.categoria]}
                  </span>
                </div>

                <p className="text-sm text-text-secondary leading-relaxed">{arq.subtitulo}</p>

                {/* Famosos */}
                <div className="flex flex-wrap gap-2">
                  {arq.famosos.map((f) => (
                    <span key={f} className="px-2.5 py-1 rounded-full text-xs font-medium bg-bg-tertiary text-text-secondary border border-border">
                      {f}
                    </span>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <a
                    href="/perfil/teste"
                    className="text-sm text-text-muted hover:text-text-primary transition-colors"
                  >
                    Refazer teste
                  </a>
                </div>
              </div>
            ) : (
              /* No result yet */
              <div className="text-center py-6 space-y-4">
                <div className="text-4xl">🎬</div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">Descubra seu Arquetipo Criativo</h3>
                  <p className="text-sm text-text-secondary mt-1">
                    23 perguntas rapidas sobre como voce trabalha. Leva menos de 3 minutos.
                  </p>
                </div>
                <a
                  href="/perfil/teste"
                  className="inline-flex px-6 py-2.5 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent-hover transition-colors"
                >
                  Fazer o teste
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Cargo */}
        <div className="bg-bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-[2px]">Cargo</h2>
          <div className="grid grid-cols-4 gap-2">
            {(Object.entries(CARGOS) as [Cargo, { label: string; color: string; icon: string }][]).map(([key, cfg]) => {
              const isActive = profile.cargo === key
              return (
                <button
                  key={key}
                  onClick={async () => {
                    const newCargo = isActive ? null : key
                    await fetch(`/api/membros/${profile.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ cargo: newCargo }),
                    })
                    window.location.reload()
                  }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all text-center ${
                    isActive
                      ? 'border-accent bg-accent/10'
                      : 'border-border bg-[#1C1C1E] hover:border-border-hover hover:bg-bg-hover'
                  }`}
                >
                  <span className="text-lg">{cfg.icon}</span>
                  <span className={`text-xs font-semibold ${isActive ? 'text-accent' : 'text-text-secondary'}`}>
                    {cfg.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Info */}
        <div className="bg-bg-card border border-border rounded-xl p-6 space-y-3">
          <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-[2px]">Informacoes</h2>
          <div className="bg-[#1C1C1E] border border-border rounded-lg p-3">
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-[1.5px] mb-1">Email</p>
            <p className="text-sm text-text-primary truncate">{profile.email}</p>
          </div>
        </div>

      </div>
    </div>
  )
}
