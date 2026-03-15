import type { Prioridade, TipoJob, TagJob, StatusMembro, Cargo } from './types'

export const PRIORIDADES: Record<Prioridade, { label: string; color: string }> = {
  urgente: { label: 'Urgente', color: '#EF4444' },
  alta: { label: 'Alta', color: '#EAB308' },
  normal: { label: 'Normal', color: '#A1A1AA' },
}

export const TIPOS_JOB: Record<TipoJob, string> = {
  publicidade: 'Filme Publicitario',
  institucional: 'Institucional',
  social: 'Social Media',
  ia: 'IA',
  varejo: 'Varejo',
}

export const STATUS_MEMBRO: Record<StatusMembro, { label: string; emoji: string; color: string }> = {
  livre: { label: 'Livre', emoji: '\u{1F7E2}', color: '#14AE5C' },
  estudando: { label: 'Estudando', emoji: '\u{1F4DA}', color: '#0D99FF' },
  producao: { label: 'Em Producao', emoji: '\u{1F3AC}', color: '#FF8C00' },
  ajuda: { label: 'Precisa de Ajuda', emoji: '\u{1F198}', color: '#F24822' },
  ausente: { label: 'Ausente', emoji: '\u23F8', color: '#8E8E93' },
}

export const TAGS: Record<TagJob, { label: string; color: string }> = {
  falta_material: { label: 'Falta Material', color: '#8E8E93' },
  arte: { label: 'Arte', color: '#E84393' },
  edicao: { label: 'Edicao', color: '#0D99FF' },
  motion: { label: 'Motion', color: '#9747FF' },
  ai_gen_still: { label: 'AI Gen Still', color: '#14AE5C' },
  ai_gen_video: { label: 'AI Gen Video', color: '#00C2CB' },
  ai_gen_upscale: { label: 'AI Gen Upscale', color: '#5B5FC7' },
  color: { label: 'Color', color: '#FF8C00' },
  mix: { label: 'Mix', color: '#00C2CB' },
  em_aprovacao: { label: 'Em Aprovacao', color: '#FF8C00' },
  refacao: { label: 'Refacao', color: '#F24822' },
  em_ajuste: { label: 'Em Ajuste', color: '#FFCD29' },
  aprovado: { label: 'Aprovado', color: '#14AE5C' },
}

export const CARGOS: Record<Cargo, { label: string; color: string; icon: string }> = {
  atendimento: { label: 'Atendimento', color: '#0D99FF', icon: '\u{1F4AC}' },
  editor: { label: 'Editor', color: '#9747FF', icon: '\u{1F3AC}' },
  motion: { label: 'Motion', color: '#E84393', icon: '\u{2728}' },
  diretor: { label: 'Diretor', color: '#FF8C00', icon: '\u{1F3AF}' },
  colorista: { label: 'Colorista', color: '#FFCD29', icon: '\u{1F3A8}' },
  sound: { label: 'Sound', color: '#00C2CB', icon: '\u{1F3B5}' },
  produtor: { label: 'Produtor', color: '#14AE5C', icon: '\u{1F4CB}' },
}
