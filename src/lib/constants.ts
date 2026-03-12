import type { Prioridade, TipoJob, TagJob, StatusMembro } from './types'

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

export const STATUS_MEMBRO: Record<StatusMembro, { label: string; emoji: string; color: string }> = {
  livre: { label: 'Livre', emoji: '\u{1F7E2}', color: '#22C55E' },
  estudando: { label: 'Estudando', emoji: '\u{1F4DA}', color: '#3B82F6' },
  producao: { label: 'Em Producao', emoji: '\u{1F3AC}', color: '#F5A623' },
  ajuda: { label: 'Precisa de Ajuda', emoji: '\u{1F198}', color: '#EF4444' },
  ausente: { label: 'Ausente', emoji: '\u23F8', color: '#6B7280' },
}

export const TAGS: Record<TagJob, { label: string; color: string }> = {
  falta_material: { label: 'Falta Material', color: '#A1A1AA' },
  arte: { label: 'Arte', color: '#EC4899' },
  edicao: { label: 'Edição', color: '#3B82F6' },
  motion: { label: 'Motion', color: '#8B5CF6' },
  ai_gen_still: { label: 'AI Gen Still', color: '#10B981' },
  ai_gen_video: { label: 'AI Gen Video', color: '#14B8A6' },
  ai_gen_upscale: { label: 'AI Gen Upscale', color: '#6366F1' },
  color: { label: 'Color', color: '#D97706' },
  mix: { label: 'Mix', color: '#06B6D4' },
  em_aprovacao: { label: 'Em Aprovação', color: '#F97316' },
  refacao: { label: 'Refação', color: '#EF4444' },
  em_ajuste: { label: 'Em Ajuste', color: '#F59E0B' },
  aprovado: { label: 'Aprovado', color: '#22C55E' },
}
