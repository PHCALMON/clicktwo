'use client'

import { useState } from 'react'
import type { Job, Profile, PersonalidadeResult } from '@/lib/types'
import { ARQUETIPOS } from '@/lib/arquetipos'

interface SquadTestClientProps {
  membros: Profile[]
  jobs: Job[]
}

const AGENTS = [
  { id: 'recap', name: 'Recap', icon: '📋', desc: 'Briefing diario personalizado', color: '#4A90D9' },
  { id: 'sentinel', name: 'Sentinel', icon: '🛡️', desc: 'Alerta de prazo e quality gate', color: '#F24822' },
  { id: 'pulse', name: 'Pulse', icon: '💜', desc: 'Nudge de status e carga', color: '#9747FF' },
  { id: 'triage', name: 'Triage', icon: '🎯', desc: 'Sugestao de distribuicao', color: '#FF8C00' },
  { id: 'relay', name: 'Relay', icon: '📨', desc: 'Rascunho update pro cliente', color: '#14AE5C' },
  { id: 'scribe', name: 'Scribe', icon: '📝', desc: 'Estruturar briefing', color: '#0D99FF' },
  { id: 'mirror', name: 'Mirror', icon: '🪞', desc: 'Comparar briefing vs entrega', color: '#00C2CB' },
  { id: 'oracle', name: 'Oracle', icon: '🔮', desc: 'Previsao de carga semanal', color: '#5B5FC7' },
  { id: 'coach', name: 'Coach', icon: '🏅', desc: 'Feedback semanal pro junior', color: '#FFCD29' },
  { id: 'archivist', name: 'Archivist', icon: '🗂️', desc: 'Verificar organizacao', color: '#E84393' },
]

export function SquadTestClient({ membros, jobs }: SquadTestClientProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [selectedMembro, setSelectedMembro] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [context, setContext] = useState<string | null>(null)

  async function runTest() {
    if (!selectedAgent || !selectedMembro) return
    setLoading(true)
    setResult(null)
    setError(null)
    setContext(null)

    try {
      const res = await fetch('/api/squad/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: selectedAgent, membro_id: selectedMembro }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`)
        return
      }

      setResult(data.mensagem || 'SEM_MENSAGEM')
      setContext(data.context ? JSON.stringify(data.context, null, 2) : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de rede')
    } finally {
      setLoading(false)
    }
  }

  const membro = membros.find((m) => m.id === selectedMembro)
  const personalidade = membro?.personalidade as PersonalidadeResult | null
  const arq = personalidade ? ARQUETIPOS[personalidade.tipo] : null

  // Stats
  const totalJobs = jobs.length
  const urgentJobs = jobs.filter((j) => {
    if (!j.data_entrega) return false
    const diff = (new Date(j.data_entrega).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return diff <= 3 && diff > -7
  })

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Squad Vigilia — Sandbox</h1>
          <p className="text-sm text-text-muted mt-1">
            Teste qualquer agente manualmente. Selecione agente + membro e veja o resultado.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-bg-card border border-border rounded-lg p-3">
            <p className="text-[10px] text-text-muted font-semibold uppercase tracking-widest">Membros</p>
            <p className="text-xl font-bold text-text-primary mt-1">{membros.length}</p>
          </div>
          <div className="bg-bg-card border border-border rounded-lg p-3">
            <p className="text-[10px] text-text-muted font-semibold uppercase tracking-widest">Jobs ativos</p>
            <p className="text-xl font-bold text-text-primary mt-1">{totalJobs}</p>
          </div>
          <div className="bg-bg-card border border-border rounded-lg p-3">
            <p className="text-[10px] text-text-muted font-semibold uppercase tracking-widest">Prazos proximos</p>
            <p className="text-xl font-bold text-fig-orange mt-1">{urgentJobs.length}</p>
          </div>
          <div className="bg-bg-card border border-border rounded-lg p-3">
            <p className="text-[10px] text-text-muted font-semibold uppercase tracking-widest">Com personalidade</p>
            <p className="text-xl font-bold text-fig-purple mt-1">{membros.filter((m) => m.personalidade).length}</p>
          </div>
        </div>

        {/* Agent selector */}
        <div className="space-y-3">
          <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-[2px]">Selecione o agente</h2>
          <div className="grid grid-cols-5 gap-2">
            {AGENTS.map((agent) => (
              <button
                key={agent.id}
                onClick={() => setSelectedAgent(agent.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center ${
                  selectedAgent === agent.id
                    ? 'border-2'
                    : 'border-border bg-bg-card hover:border-border-hover'
                }`}
                style={selectedAgent === agent.id ? {
                  borderColor: agent.color,
                  backgroundColor: `${agent.color}12`,
                } : undefined}
              >
                <span className="text-xl">{agent.icon}</span>
                <span className={`text-xs font-semibold ${selectedAgent === agent.id ? 'text-text-primary' : 'text-text-secondary'}`}>
                  {agent.name}
                </span>
              </button>
            ))}
          </div>
          {selectedAgent && (
            <p className="text-xs text-text-muted">
              {AGENTS.find((a) => a.id === selectedAgent)?.desc}
            </p>
          )}
        </div>

        {/* Member selector */}
        <div className="space-y-3">
          <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-[2px]">Selecione o membro</h2>
          <div className="grid grid-cols-3 gap-2">
            {membros.map((m) => {
              const p = m.personalidade as PersonalidadeResult | null
              const a = p ? ARQUETIPOS[p.tipo] : null
              const firstName = m.nome?.split(' ')[0] || m.email?.split('@')[0] || '?'
              const isSelected = selectedMembro === m.id

              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMembro(m.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    isSelected
                      ? 'border-accent bg-accent/10'
                      : 'border-border bg-bg-card hover:border-border-hover'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {firstName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold truncate ${isSelected ? 'text-accent' : 'text-text-primary'}`}>
                      {firstName}
                    </p>
                    <p className="text-[10px] text-text-muted truncate">
                      {a ? `${a.icone} ${p?.arquetipo}` : 'Sem teste'}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Run button */}
        <button
          onClick={runTest}
          disabled={!selectedAgent || !selectedMembro || loading}
          className="w-full py-3.5 rounded-xl bg-accent text-white font-semibold text-base transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent-hover"
        >
          {loading ? 'Gerando...' : `Testar ${selectedAgent ? AGENTS.find((a) => a.id === selectedAgent)?.name : 'agente'}`}
        </button>

        {/* Result */}
        {(result || error) && (
          <div className="space-y-4">
            <h2 className="text-[11px] font-semibold text-text-muted uppercase tracking-[2px]">Resultado</h2>

            {error && (
              <div className="bg-fig-red/10 border border-fig-red/30 rounded-xl p-4">
                <p className="text-sm text-fig-red">{error}</p>
              </div>
            )}

            {result && (
              <div className="bg-bg-card border border-border rounded-xl p-6 space-y-4">
                {/* Agent badge */}
                {selectedAgent && (() => {
                  const ag = AGENTS.find((a) => a.id === selectedAgent)
                  return ag ? (
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{ag.icon}</span>
                      <span className="text-sm font-semibold" style={{ color: ag.color }}>{ag.name}</span>
                      <span className="text-xs text-text-muted">→ {membro?.nome || 'Membro'}</span>
                      {arq && personalidade && (
                        <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${personalidade.cor}15`, color: personalidade.cor }}>
                          {arq.icone} {personalidade.arquetipo}
                        </span>
                      )}
                    </div>
                  ) : null
                })()}

                {/* Message */}
                <div className="bg-[#111113] rounded-lg p-4">
                  <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{result}</p>
                </div>

                {result === 'SEM_MENSAGEM' && (
                  <p className="text-xs text-text-muted">O agente decidiu nao enviar mensagem (sem dados suficientes ou nada relevante).</p>
                )}
              </div>
            )}

            {/* Context (debug) */}
            {context && (
              <details className="bg-bg-card border border-border rounded-xl overflow-hidden">
                <summary className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-widest cursor-pointer hover:bg-bg-hover">
                  Debug — Contexto enviado pro agente
                </summary>
                <pre className="px-4 pb-4 text-xs text-text-muted overflow-x-auto max-h-80">
                  {context}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
