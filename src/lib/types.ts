export type StatusMembro = 'livre' | 'estudando' | 'producao' | 'ajuda' | 'ausente'

export type Prioridade = 'urgente' | 'alta' | 'normal'

export type TipoJob = 'publicidade' | 'institucional' | 'social' | 'ia' | 'varejo'

export type TagJob = 'falta_material' | 'arte' | 'edicao' | 'motion' | 'ai_gen_still' | 'ai_gen_video' | 'ai_gen_upscale' | 'color' | 'mix' | 'em_aprovacao' | 'refacao' | 'em_ajuste' | 'aprovado'

export interface Coluna {
  id: string
  nome: string
  cor: string | null
  posicao: number
  created_at: string
}

export interface Cliente {
  id: string
  nome: string
  dominio: string | null
  cor: string | null
  drive_folder_url: string | null
  created_at: string
}

export interface Job {
  id: string
  cliente_id: string
  campanha: string
  tipo_job: TipoJob
  coluna_id: string
  posicao: number
  data_entrega: string | null
  hora_entrega_cliente: string | null
  margem_horas: number | null
  prioridade: Prioridade
  tags: TagJob[]
  assignee_id: string | null
  em_producao_por: string | null
  drive_folder_url: string | null
  freela_nome: string | null
  freela_funcao: string | null
  created_at: string
  created_by: string
  // joined
  cliente?: Cliente
  coluna?: Coluna
  entregas?: Entrega[]
  // aggregated
  entregas_total?: number
  entregas_concluidas?: number
}

export type Cargo = 'atendimento' | 'editor' | 'motion' | 'diretor' | 'colorista' | 'sound' | 'produtor' | 'filmmaker' | 'roteirista'

export type CategoriaPersonalidade = 'analistas' | 'diplomatas' | 'sentinelas' | 'exploradores'

export type Identidade = 'assertivo' | 'turbulento'

export interface PersonalidadeResult {
  tipo: string
  arquetipo: string
  categoria: CategoriaPersonalidade
  cor: string
  descricao: string
  identidade: Identidade
  scores: {
    energia: number
    percepcao: number
    decisao: number
    estrutura: number
    identidade: number
  }
  respondido_em: string
}

export interface Profile {
  id: string
  nome: string
  email: string
  avatar_url: string | null
  status: StatusMembro
  status_texto: string | null
  status_updated_at: string
  cargo: Cargo[] | string | null
  personalidade: PersonalidadeResult | null
  created_at: string
}

export interface Comentario {
  id: string
  job_id: string
  autor_id: string
  texto: string
  resolvido: boolean
  mencoes: string[]
  created_at: string
  // joined
  autor?: Profile
}

export interface Notificacao {
  id: string
  user_id: string
  tipo: string
  job_id: string | null
  comentario_id: string | null
  autor_nome: string | null
  job_campanha: string | null
  lida: boolean
  created_at: string
}

export interface Entrega {
  id: string
  job_id: string
  nome: string
  tag: TagJob | null
  concluida: boolean
  posicao: number
  data_entrega: string | null
  hora_entrega_cliente: string | null
  margem_horas: number | null
  created_at: string
}

export interface Arquivo {
  id: string
  job_id: string
  nome: string
  storage_path: string
  drive_url: string | null
  tamanho: number | null
  tipo_mime: string | null
  uploaded_by: string
  created_at: string
}

export interface Tarefa {
  id: string
  titulo: string
  criado_por: string
  atribuido_a: string
  concluida: boolean
  data_limite: string | null
  created_at: string
  criador?: Profile
  atribuido?: Profile
}

export interface Nota {
  id: string
  user_id: string
  titulo: string
  conteudo: string
  posicao: number
  updated_at: string
  created_at: string
}
