export type Prioridade = 'urgente' | 'alta' | 'normal'

export type TipoJob = 'publicidade' | 'institucional' | 'social' | 'ia' | 'varejo'

export type TagJob = 'edicao' | 'motion' | 'ajuste' | 'refacao' | 'arte' | 'em_aprovacao' | 'aprovado' | 'falta_material' | 'mix'

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
  prioridade: Prioridade
  tags: TagJob[]
  drive_folder_url: string | null
  freela_nome: string | null
  freela_funcao: string | null
  created_at: string
  created_by: string
  // joined
  cliente?: Cliente
  coluna?: Coluna
}

export interface Profile {
  id: string
  nome: string
  email: string
  avatar_url: string | null
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
