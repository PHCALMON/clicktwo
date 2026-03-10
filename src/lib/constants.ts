import type { Prioridade, TipoJob, TagJob } from './types'

export const PRIORIDADES: Record<Prioridade, { label: string; color: string }> = {
  urgente: { label: 'Urgente', color: '#EF4444' },
  alta: { label: 'Alta', color: '#EAB308' },
  normal: { label: 'Normal', color: '#A1A1AA' },
}

export const TIPOS_JOB: Record<TipoJob, string> = {
  publicidade: 'Filme Publicitário',
  institucional: 'Institucional',
  social: 'Social Media',
  ia: 'IA',
  varejo: 'Varejo',
}

export const TAGS: Record<TagJob, { label: string; color: string }> = {
  edicao: { label: 'Edição', color: '#3B82F6' },
  motion: { label: 'Motion', color: '#8B5CF6' },
  ajuste: { label: 'Ajuste', color: '#F59E0B' },
  refacao: { label: 'Refação', color: '#EF4444' },
  arte: { label: 'Arte', color: '#EC4899' },
  em_aprovacao: { label: 'Em Aprovação', color: '#F97316' },
  aprovado: { label: 'Aprovado', color: '#22C55E' },
  falta_material: { label: 'Falta Material', color: '#A1A1AA' },
  mix: { label: 'Mix', color: '#06B6D4' },
}
