import type { Coluna, Job, Cliente, Profile } from '@/lib/types'
import { BoardClient } from './_components/board-client'

const isDemoMode = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')

const DEMO_CLIENTES: Cliente[] = [
  { id: 'c1', nome: 'Banco XP', dominio: null, cor: '#FF8C00', drive_folder_url: null, created_at: '' },
  { id: 'c2', nome: 'Natura', dominio: null, cor: '#14AE5C', drive_folder_url: null, created_at: '' },
  { id: 'c3', nome: 'Itaú', dominio: null, cor: '#4A90D9', drive_folder_url: null, created_at: '' },
  { id: 'c4', nome: 'Ambev', dominio: null, cor: '#EF4444', drive_folder_url: null, created_at: '' },
  { id: 'c5', nome: 'Magazine Luiza', dominio: null, cor: '#E84393', drive_folder_url: null, created_at: '' },
]

const DEMO_COLUNAS: Coluna[] = [
  { id: '1', nome: 'CHECK IN', cor: null, posicao: 0, created_at: '' },
  { id: '2', nome: 'VIDAL', cor: '#3B82F6', posicao: 1, created_at: '' },
  { id: '3', nome: 'PEDRO', cor: '#3B82F6', posicao: 2, created_at: '' },
  { id: '4', nome: 'CAIO', cor: '#3B82F6', posicao: 3, created_at: '' },
  { id: '5', nome: 'JOAO P', cor: '#3B82F6', posicao: 4, created_at: '' },
  { id: '10', nome: 'FREELA', cor: '#F59E0B', posicao: 5, created_at: '' },
  { id: '6', nome: 'AFTER', cor: null, posicao: 6, created_at: '' },
  { id: '7', nome: 'PARA AUDIO', cor: null, posicao: 7, created_at: '' },
  { id: '8', nome: 'REVISÃO', cor: null, posicao: 8, created_at: '' },
  { id: '9', nome: 'CLIENTE/AGÊNCIA', cor: '#22C55E', posicao: 9, created_at: '' },
]

const DEMO_JOBS: Job[] = [
  {
    id: 'j1', cliente_id: 'c1', campanha: 'Campanha XP', tipo_job: 'publicidade',
    coluna_id: '1', posicao: 0, data_entrega: '2026-03-12', prioridade: 'urgente',
    tags: ['edicao'], em_producao_por: null, hora_entrega_cliente: null, margem_horas: 4, drive_folder_url: null, freela_nome: null, freela_funcao: null, assignee_id: null,
    created_at: '', created_by: '',
    cliente: { id: 'c1', nome: 'Banco XP', dominio: null, cor: '#FF8C00', drive_folder_url: null, created_at: '' },
  },
  {
    id: 'j2', cliente_id: 'c2', campanha: 'Vídeo Institucional', tipo_job: 'institucional',
    coluna_id: '1', posicao: 1, data_entrega: '2026-03-20', prioridade: 'normal',
    tags: ['falta_material'], em_producao_por: null, hora_entrega_cliente: null, margem_horas: 4, drive_folder_url: null, freela_nome: null, freela_funcao: null, assignee_id: null,
    created_at: '', created_by: '',
    cliente: { id: 'c2', nome: 'Natura', dominio: null, cor: '#14AE5C', drive_folder_url: null, created_at: '' },
  },
  {
    id: 'j3', cliente_id: 'c3', campanha: 'Logo Animado', tipo_job: 'publicidade',
    coluna_id: '2', posicao: 0, data_entrega: '2026-03-15', prioridade: 'alta',
    tags: ['motion', 'arte'], em_producao_por: null, hora_entrega_cliente: null, margem_horas: 4, drive_folder_url: null, freela_nome: null, freela_funcao: null, assignee_id: null,
    created_at: '', created_by: '',
    cliente: { id: 'c3', nome: 'Itaú', dominio: null, cor: '#4A90D9', drive_folder_url: null, created_at: '' },
  },
  {
    id: 'j4', cliente_id: 'c1', campanha: 'Reels Q1', tipo_job: 'social',
    coluna_id: '3', posicao: 0, data_entrega: '2026-03-18', prioridade: 'alta',
    tags: ['edicao', 'color'], em_producao_por: null, hora_entrega_cliente: null, margem_horas: 4, drive_folder_url: null, freela_nome: null, freela_funcao: null, assignee_id: null,
    created_at: '', created_by: '',
    cliente: { id: 'c1', nome: 'Banco XP', dominio: null, cor: '#FF8C00', drive_folder_url: null, created_at: '' },
  },
  {
    id: 'j5', cliente_id: 'c4', campanha: 'Spot 30s', tipo_job: 'publicidade',
    coluna_id: '10', posicao: 0, data_entrega: '2026-03-14', prioridade: 'urgente',
    tags: ['mix', 'em_aprovacao'], em_producao_por: null, hora_entrega_cliente: null, margem_horas: 4, drive_folder_url: null, freela_nome: 'Lucas Silva', freela_funcao: 'Motion Designer', assignee_id: null,
    created_at: '', created_by: '',
    cliente: { id: 'c4', nome: 'Ambev', dominio: null, cor: '#EF4444', drive_folder_url: null, created_at: '' },
  },
  {
    id: 'j6', cliente_id: 'c5', campanha: 'Catálogo IA', tipo_job: 'varejo',
    coluna_id: '8', posicao: 0, data_entrega: '2026-03-11', prioridade: 'normal',
    tags: ['aprovado'], em_producao_por: null, hora_entrega_cliente: null, margem_horas: 4, drive_folder_url: null, freela_nome: null, freela_funcao: null, assignee_id: null,
    created_at: '', created_by: '',
    cliente: { id: 'c5', nome: 'Magazine Luiza', dominio: null, cor: '#E84393', drive_folder_url: null, created_at: '' },
  },
]

export default async function BoardPage() {
  let colunas = DEMO_COLUNAS
  let jobs = DEMO_JOBS
  let clientes = DEMO_CLIENTES
  let membros: Profile[] = []
  let currentUserId = ''

  if (!isDemoMode) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const [colunasRes, jobsRes, clientesRes, membrosRes, userRes] = await Promise.all([
      supabase.from('colunas').select('*').order('posicao'),
      supabase.from('jobs').select('*, cliente:clientes(*), entregas(*)').order('posicao'),
      supabase.from('clientes').select('*').order('nome'),
      supabase.from('profiles').select('id, nome, email, avatar_url, status, status_texto, status_updated_at, cargo').order('nome'),
      supabase.auth.getUser(),
    ])

    colunas = colunasRes.data ?? DEMO_COLUNAS
    jobs = (jobsRes.data ?? DEMO_JOBS) as Job[]
    clientes = clientesRes.data ?? DEMO_CLIENTES
    membros = (membrosRes.data ?? []) as Profile[]
    currentUserId = userRes.data?.user?.id ?? ''
  }

  return <BoardClient colunas={colunas} jobs={jobs} clientes={clientes} membros={membros} currentUserId={currentUserId} />
}
