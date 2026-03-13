import type { Entrega } from '@/lib/types'

export type PrioridadeAuto = 'atrasado' | 'para_amanha' | 'urgente' | 'alta' | 'sem_urgencia'

interface PrioridadeResult {
  level: PrioridadeAuto
  label: string
  color: string
  countdown: string | null
  pulse: boolean
}

export interface JobPrioridadeResult extends PrioridadeResult {
  entregasConcluidas: number
  entregasTotal: number
}

/**
 * Calculate internal deadline by subtracting margin hours from client deadline.
 * Clamps to business hours (8h-19h) — if result falls before 8h, moves to previous day 18h.
 */
export function calcDeadlineInterno(
  data: string,
  horaCliente: string | null,
  margemHoras: number | null,
): Date {
  if (!horaCliente) {
    // No time set — use date-only (start of day)
    return new Date(data + 'T00:00:00')
  }

  const margem = margemHoras ?? 4
  const [h, m] = horaCliente.split(':').map(Number)
  const deadline = new Date(data + 'T00:00:00')
  deadline.setHours(h, m, 0, 0)

  // Subtract margin
  deadline.setHours(deadline.getHours() - margem)

  // Clamp to business hours (8h-19h)
  if (deadline.getHours() < 8) {
    // Before business hours → previous day 18h
    deadline.setDate(deadline.getDate() - 1)
    deadline.setHours(18, 0, 0, 0)
  } else if (deadline.getHours() > 19) {
    // After business hours → same day 18h
    deadline.setHours(18, 0, 0, 0)
  }

  return deadline
}

/**
 * Calculate priority from a date (and optionally time + margin).
 * When hora is provided, uses hour-level precision for "today" deadlines.
 */
export function calcPrioridade(
  dataEntrega: string | null,
  horaCliente?: string | null,
  margemHoras?: number | null,
): PrioridadeResult {
  if (!dataEntrega) {
    return { level: 'sem_urgencia', label: 'Sem Urgencia', color: '#A1A1AA', countdown: null, pulse: false }
  }

  const agora = new Date()
  const deadline = horaCliente
    ? calcDeadlineInterno(dataEntrega, horaCliente, margemHoras ?? null)
    : new Date(dataEntrega + 'T00:00:00')

  // For date-only comparison (no time set)
  if (!horaCliente) {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const diffMs = deadline.getTime() - hoje.getTime()
    const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24))

    if (diffDias < 0) {
      const atraso = Math.abs(diffDias)
      return {
        level: 'atrasado', label: 'Atrasado', color: '#EF4444',
        countdown: atraso === 1 ? 'atrasado 1d' : `atrasado ${atraso}d`,
        pulse: true,
      }
    }
    if (diffDias === 0) return { level: 'para_amanha', label: 'Para Hoje', color: '#EF4444', countdown: 'hoje', pulse: false }
    if (diffDias === 1) return { level: 'para_amanha', label: 'Para Amanha', color: '#EF4444', countdown: 'amanha', pulse: false }
    if (diffDias <= 3) return { level: 'urgente', label: 'Urgente', color: '#F97316', countdown: `${diffDias}d`, pulse: false }
    if (diffDias <= 7) return { level: 'alta', label: 'Alta', color: '#EAB308', countdown: `${diffDias}d`, pulse: false }
    return { level: 'sem_urgencia', label: 'Sem Urgencia', color: '#A1A1AA', countdown: `${diffDias}d`, pulse: false }
  }

  // Hour-aware comparison (time is set)
  const diffMs = deadline.getTime() - agora.getTime()
  const diffHoras = Math.round(diffMs / (1000 * 60 * 60))
  const diffDias = Math.floor(diffHoras / 24)
  const horasResto = Math.abs(diffHoras) % 24
  const deadlineHora = `${String(deadline.getHours()).padStart(2, '0')}:${String(deadline.getMinutes()).padStart(2, '0')}`

  if (diffMs < 0) {
    // Overdue
    const atrasoH = Math.abs(diffHoras)
    let countdown: string
    if (atrasoH < 24) {
      countdown = `atrasado ${atrasoH}h`
    } else {
      const d = Math.floor(atrasoH / 24)
      const h = atrasoH % 24
      countdown = h > 0 ? `atrasado ${d}d ${h}h` : `atrasado ${d}d`
    }
    return { level: 'atrasado', label: 'Atrasado', color: '#EF4444', countdown, pulse: true }
  }

  if (diffDias === 0) {
    // Due today
    return {
      level: 'para_amanha', label: 'Hoje', color: '#EF4444',
      countdown: `hoje ${deadlineHora}`,
      pulse: diffHoras <= 2,
    }
  }

  if (diffDias === 1) {
    return {
      level: 'para_amanha', label: 'Amanha', color: '#EF4444',
      countdown: `amanha ${deadlineHora}`,
      pulse: false,
    }
  }

  if (diffDias <= 3) {
    return {
      level: 'urgente', label: 'Urgente', color: '#F97316',
      countdown: horasResto > 0 ? `${diffDias}d ${horasResto}h` : `${diffDias}d`,
      pulse: false,
    }
  }

  if (diffDias <= 7) {
    return { level: 'alta', label: 'Alta', color: '#EAB308', countdown: `${diffDias}d`, pulse: false }
  }

  return { level: 'sem_urgencia', label: 'Sem Urgencia', color: '#A1A1AA', countdown: `${diffDias}d`, pulse: false }
}

interface DeadlineInfo {
  date: string
  hora: string | null
  margem: number | null
}

/**
 * Calculate job priority considering both job and individual entregas.
 * Uses the most urgent internal deadline across all pending items.
 */
export function calcJobPrioridade(
  jobDataEntrega: string | null,
  entregas?: Entrega[],
  jobHora?: string | null,
  jobMargem?: number | null,
): JobPrioridadeResult {
  const total = entregas?.length ?? 0
  const concluidas = entregas?.filter((e) => e.concluida).length ?? 0

  // Collect all deadlines with their time info
  const deadlines: DeadlineInfo[] = []
  if (jobDataEntrega) {
    deadlines.push({ date: jobDataEntrega, hora: jobHora ?? null, margem: jobMargem ?? null })
  }
  if (entregas) {
    for (const e of entregas) {
      if (!e.concluida && e.data_entrega) {
        deadlines.push({ date: e.data_entrega, hora: e.hora_entrega_cliente ?? null, margem: e.margem_horas ?? null })
      }
    }
  }

  if (deadlines.length === 0) {
    return {
      level: 'sem_urgencia', label: 'Sem Urgencia', color: '#A1A1AA',
      countdown: null, pulse: false,
      entregasConcluidas: concluidas, entregasTotal: total,
    }
  }

  // Find most urgent internal deadline
  let mostUrgent: DeadlineInfo = deadlines[0]
  let mostUrgentTime = deadlines[0].hora
    ? calcDeadlineInterno(deadlines[0].date, deadlines[0].hora, deadlines[0].margem).getTime()
    : new Date(deadlines[0].date + 'T00:00:00').getTime()

  for (let i = 1; i < deadlines.length; i++) {
    const d = deadlines[i]
    const t = d.hora
      ? calcDeadlineInterno(d.date, d.hora, d.margem).getTime()
      : new Date(d.date + 'T00:00:00').getTime()
    if (t < mostUrgentTime) {
      mostUrgent = d
      mostUrgentTime = t
    }
  }

  const prio = calcPrioridade(mostUrgent.date, mostUrgent.hora, mostUrgent.margem)

  return {
    ...prio,
    entregasConcluidas: concluidas,
    entregasTotal: total,
  }
}
