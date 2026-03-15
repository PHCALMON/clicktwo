'use client'

import { useMemo } from 'react'
import type { Job, Profile, StatusMembro } from '@/lib/types'
import { STATUS_MEMBRO, TAGS, CARGOS } from '@/lib/constants'
import type { Cargo } from '@/lib/types'
import { calcJobPrioridade } from '@/lib/priority'
import { ClientLogo } from '@/components/ui/client-logo'

interface HomeClientProps {
  jobs: Job[]
  membros: Profile[]
  currentUser: Profile | null
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function getDateStr(): string {
  const d = new Date()
  const dias = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado']
  const meses = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  return `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]} ${d.getFullYear()}`
}

export function HomeClient({ jobs, membros, currentUser }: HomeClientProps) {
  const firstName = currentUser?.nome?.split(' ')[0] || currentUser?.email?.split('@')[0] || 'Usuario'

  // Jobs with priority calculated
  const jobsWithPrio = useMemo(() => {
    return jobs.map((job) => ({
      ...job,
      prio: calcJobPrioridade(job.data_entrega, job.entregas, job.hora_entrega_cliente, job.margem_horas),
    }))
  }, [jobs])

  // Today's urgent jobs (atrasado, para_amanha, urgente)
  const urgentJobs = useMemo(() => {
    return jobsWithPrio
      .filter((j) => ['atrasado', 'para_amanha', 'urgente'].includes(j.prio.level))
      .sort((a, b) => {
        const order = { atrasado: 0, para_amanha: 1, urgente: 2, alta: 3, sem_urgencia: 4 }
        return (order[a.prio.level] ?? 4) - (order[b.prio.level] ?? 4)
      })
  }, [jobsWithPrio])

  // Stats
  const totalJobs = jobs.length
  const totalEntregas = jobs.reduce((sum, j) => sum + (j.entregas?.length ?? 0), 0)
  const entregasConcluidas = jobs.reduce((sum, j) => sum + (j.entregas?.filter((e) => e.concluida).length ?? 0), 0)
  const entregasPct = totalEntregas > 0 ? Math.round((entregasConcluidas / totalEntregas) * 100) : 0

  // Most urgent job
  const mostUrgent = urgentJobs[0]

  // Producao map for team
  const producaoMap = useMemo(() => {
    const map = new Map<string, Job>()
    for (const job of jobs) {
      if (job.em_producao_por) map.set(job.em_producao_por, job)
    }
    return map
  }, [jobs])

  // Motivation message
  const motivation = useMemo(() => {
    const count = urgentJobs.length
    if (count === 0) return 'Tudo tranquilo hoje. Bom momento pra organizar ou adiantar entregas.'
    if (mostUrgent && mostUrgent.prio.countdown) {
      return `Voce tem ${count} job${count > 1 ? 's' : ''} no radar. ${mostUrgent.cliente?.nome ?? 'O mais urgente'} eh o mais urgente — ${mostUrgent.prio.countdown}. Foco nele primeiro e o resto flui.`
    }
    return `Voce tem ${count} job${count > 1 ? 's' : ''} urgentes hoje. Bora!`
  }, [urgentJobs, mostUrgent])

  async function handleStatusChange(status: StatusMembro) {
    await fetch('/api/membros/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    window.location.href = '/board'
  }

  return (
    <div className="flex flex-1 h-full">
      {/* Main content */}
      <div className="flex-1 px-8 py-6 overflow-auto">
        {/* Topbar */}
        <div className="flex items-center justify-between mb-8">
          <span className="text-sm text-text-muted">{getDateStr()}</span>
          <div className="flex items-center gap-2.5">
            <span className="text-sm text-text-primary font-medium">{firstName}</span>
            <div className="w-8 h-8 rounded-full bg-accent/20 text-accent text-sm font-bold flex items-center justify-center">
              {firstName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Greeting */}
        <div className="mb-8">
          <p className="text-text-secondary text-lg font-light">{getGreeting()},</p>
          <h1 className="text-3xl font-bold text-text-primary mt-1">
            <span className="font-display italic font-normal">{firstName}.</span>{' '}
            <span className="text-text-secondary font-light">Como vai ser hoje?</span>
          </h1>
          <p className="text-text-secondary text-sm mt-3 max-w-xl leading-relaxed">
            {motivation}
          </p>
        </div>

        {/* Status selector */}
        <div className="mb-8">
          <p className="text-xs text-text-muted font-semibold uppercase tracking-widest mb-3">Como voce vai comecar?</p>
          <div className="flex gap-3">
            <button
              onClick={() => handleStatusChange('producao')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-fig-orange/10 border border-fig-orange/20 text-fig-orange font-semibold text-sm hover:bg-fig-orange/20 transition-all"
            >
              <span className="text-lg">&#127916;</span>
              Produzir
              {urgentJobs.length > 0 && (
                <span className="min-w-[20px] h-5 rounded-full bg-fig-orange/20 text-fig-orange text-[10px] font-bold flex items-center justify-center px-1.5">
                  {urgentJobs.length}
                </span>
              )}
            </button>
            <button
              onClick={() => handleStatusChange('estudando')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-fig-blue/10 border border-fig-blue/20 text-fig-blue font-semibold text-sm hover:bg-fig-blue/20 transition-all"
            >
              <span className="text-lg">&#128218;</span>
              Estudar
            </button>
            <button
              onClick={() => handleStatusChange('livre')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-fig-green/10 border border-fig-green/20 text-fig-green font-semibold text-sm hover:bg-fig-green/20 transition-all"
            >
              <span className="text-lg">&#128994;</span>
              Livre
            </button>
            <button
              onClick={() => handleStatusChange('ausente')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-bg-elevated border border-border text-text-muted font-semibold text-sm hover:bg-bg-hover transition-all"
            >
              <span className="text-lg">&#9198;</span>
              Ausente
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <p className="text-[10px] text-text-muted font-semibold uppercase tracking-widest">Jobs Ativos</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{totalJobs}</p>
            <p className="text-xs text-text-muted mt-0.5">{urgentJobs.length} urgentes</p>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <p className="text-[10px] text-text-muted font-semibold uppercase tracking-widest">Entregas</p>
            <p className="text-2xl font-bold text-text-primary mt-1">
              {entregasConcluidas} <span className="text-sm text-text-muted font-normal">/ {totalEntregas}</span>
            </p>
            <p className="text-xs text-text-muted mt-0.5">{entregasPct}% concluidas</p>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <p className="text-[10px] text-text-muted font-semibold uppercase tracking-widest">Prazo mais proximo</p>
            <p className="text-2xl font-bold mt-1" style={{ color: mostUrgent?.prio.color ?? '#A1A1AA' }}>
              {mostUrgent?.prio.countdown ?? '—'}
            </p>
            <p className="text-xs text-text-muted mt-0.5 truncate">
              {mostUrgent?.cliente?.nome ?? ''} {mostUrgent ? `— ${mostUrgent.campanha}` : 'Nenhum urgente'}
            </p>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <p className="text-[10px] text-text-muted font-semibold uppercase tracking-widest">Total Jobs</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{totalJobs} <span className="text-sm text-text-muted font-normal">jobs</span></p>
            <p className="text-xs text-text-muted mt-0.5">{entregasConcluidas} concluidos</p>
          </div>
        </div>

        {/* Today's jobs */}
        {urgentJobs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-text-primary">
                Seus jobs <span className="font-display italic font-normal text-text-secondary">urgentes</span>
              </h2>
              <span className="text-xs text-text-muted">{urgentJobs.length} jobs</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {urgentJobs.slice(0, 6).map((job) => (
                <a
                  key={job.id}
                  href="/board"
                  className="bg-bg-card border border-border rounded-xl p-4 hover:border-border-hover hover:-translate-y-0.5 transition-all group"
                  style={{ borderLeft: `3px solid ${job.prio.color}` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    {job.cliente && (
                      <ClientLogo nome={job.cliente.nome} dominio={job.cliente.dominio} cor={job.cliente.cor} size="md" />
                    )}
                    <span
                      className="text-xs font-mono font-bold"
                      style={{ color: job.prio.color }}
                    >
                      {job.prio.countdown}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">{job.campanha}</h3>
                  <p className="text-xs text-text-muted mt-0.5">{job.cliente?.nome}</p>
                  <div className="flex items-center justify-between mt-2.5">
                    <div className="flex gap-1">
                      {job.tags.slice(0, 2).map((tag) => {
                        const t = TAGS[tag]
                        return t ? (
                          <span
                            key={tag}
                            className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: `${t.color}15`, color: t.color }}
                          >
                            {t.label}
                          </span>
                        ) : null
                      })}
                    </div>
                    {job.prio.entregasTotal > 0 && (
                      <span className="text-[10px] text-text-muted">
                        {job.prio.entregasConcluidas}/{job.prio.entregasTotal}
                      </span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Go to board link */}
        <div className="mt-6 flex justify-center">
          <a
            href="/board"
            className="text-sm text-accent hover:text-accent-hover font-medium transition-colors"
          >
            Ver board completo &rarr;
          </a>
        </div>
      </div>

      {/* Right panel — Team */}
      <aside className="w-64 shrink-0 border-l border-border bg-bg-secondary p-4 overflow-auto">
        <p className="text-[10px] text-text-muted font-semibold uppercase tracking-widest mb-3">Equipe agora</p>
        <div className="space-y-3">
          {membros.filter((m) => m.id !== currentUser?.id).map((membro) => {
            const statusInfo = STATUS_MEMBRO[membro.status] ?? STATUS_MEMBRO.livre
            const jobAtivo = producaoMap.get(membro.id)
            return (
              <div key={membro.id} className="flex items-start gap-2.5">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-bg-tertiary text-text-secondary text-xs font-bold flex items-center justify-center">
                    {membro.nome?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-bg-secondary"
                    style={{ backgroundColor: statusInfo.color }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-text-primary">{membro.nome?.split(' ')[0]}</p>
                    {membro.cargo && (() => {
                      const cargoInfo = CARGOS[membro.cargo as Cargo]
                      return cargoInfo ? (
                        <span className="text-[8px] font-semibold uppercase px-1 py-0.5 rounded" style={{ backgroundColor: `${cargoInfo.color}15`, color: cargoInfo.color }}>
                          {cargoInfo.label}
                        </span>
                      ) : null
                    })()}
                  </div>
                  <p className="text-xs text-text-muted truncate">
                    {membro.status === 'producao' && jobAtivo ? (
                      <span>&#127916; {jobAtivo.campanha} — {jobAtivo.cliente?.nome}</span>
                    ) : membro.status === 'estudando' && membro.status_texto ? (
                      <span>&#128218; {membro.status_texto}</span>
                    ) : (
                      <span>{statusInfo.emoji} {statusInfo.label}</span>
                    )}
                  </p>
                </div>
              </div>
            )
          })}
          {membros.filter((m) => m.id !== currentUser?.id).length === 0 && (
            <p className="text-xs text-text-muted">Nenhum membro online</p>
          )}
        </div>
      </aside>
    </div>
  )
}
