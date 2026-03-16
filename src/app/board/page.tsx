import type { Coluna, Job, Cliente, Profile, EntregaWithJob } from '@/lib/types'
import { BoardClient } from './_components/board-client'

const isDemoMode = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')

const DEMO_CLIENTES: Cliente[] = [
  { id: 'c1', nome: 'Banco XP', dominio: null, cor: '#FF8C00', drive_folder_url: null, created_at: '' },
  { id: 'c2', nome: 'Natura', dominio: null, cor: '#14AE5C', drive_folder_url: null, created_at: '' },
  { id: 'c3', nome: 'Itau', dominio: null, cor: '#4A90D9', drive_folder_url: null, created_at: '' },
  { id: 'c4', nome: 'Ambev', dominio: null, cor: '#EF4444', drive_folder_url: null, created_at: '' },
  { id: 'c5', nome: 'Magazine Luiza', dominio: null, cor: '#E84393', drive_folder_url: null, created_at: '' },
]

const DEMO_COLUNAS: Coluna[] = [
  { id: '1', nome: 'CHECK IN', slug: 'check_in', cor: null, posicao: 0, posicao_fluxo: 1, protegida: true, created_at: '' },
  { id: '2', nome: 'PRODUCAO', slug: 'producao', cor: '#3B82F6', posicao: 1, posicao_fluxo: 2, protegida: false, created_at: '' },
  { id: '3', nome: 'REVISAO INTERNA', slug: 'revisao_interna', cor: '#3B82F6', posicao: 2, posicao_fluxo: 3, protegida: true, created_at: '' },
  { id: '4', nome: 'AJUSTE', slug: 'ajuste', cor: '#F59E0B', posicao: 3, posicao_fluxo: 4, protegida: false, created_at: '' },
  { id: '5', nome: 'PRE ENVIO', slug: 'pre_envio', cor: '#3B82F6', posicao: 4, posicao_fluxo: 5, protegida: false, created_at: '' },
  { id: '6', nome: 'REVISAO CLIENTE', slug: 'revisao_cliente', cor: '#22C55E', posicao: 5, posicao_fluxo: 6, protegida: true, created_at: '' },
  { id: '7', nome: 'ALTERACOES', slug: 'alteracoes', cor: '#F59E0B', posicao: 6, posicao_fluxo: 7, protegida: false, created_at: '' },
  { id: '8', nome: 'ENTREGUE', slug: 'entregue', cor: '#22C55E', posicao: 7, posicao_fluxo: 8, protegida: false, created_at: '' },
  { id: '9', nome: 'ARQUIVO', slug: 'arquivo', cor: '#A1A1AA', posicao: 8, posicao_fluxo: 9, protegida: false, created_at: '' },
]

const DEMO_JOBS: Job[] = [
  {
    id: 'j1', cliente_id: 'c1', campanha: 'Campanha XP', tipo_job: 'publicidade',
    coluna_id: '1', posicao: 0, data_entrega: '2026-03-12', prioridade: 'urgente',
    tags: ['edicao'], em_producao_por: null, hora_entrega_cliente: null, margem_horas: 4, drive_folder_url: null, freela_nome: null, freela_funcao: null, assignee_id: null,
    briefing_texto: null, link_entrega_cliente: null, aprovado_interno: false, checagem_final: false, aprovado_cliente: false,
    created_at: '', created_by: '',
    cliente: { id: 'c1', nome: 'Banco XP', dominio: null, cor: '#FF8C00', drive_folder_url: null, created_at: '' },
  },
  {
    id: 'j2', cliente_id: 'c2', campanha: 'Video Institucional', tipo_job: 'institucional',
    coluna_id: '1', posicao: 1, data_entrega: '2026-03-20', prioridade: 'normal',
    tags: ['falta_material'], em_producao_por: null, hora_entrega_cliente: null, margem_horas: 4, drive_folder_url: null, freela_nome: null, freela_funcao: null, assignee_id: null,
    briefing_texto: null, link_entrega_cliente: null, aprovado_interno: false, checagem_final: false, aprovado_cliente: false,
    created_at: '', created_by: '',
    cliente: { id: 'c2', nome: 'Natura', dominio: null, cor: '#14AE5C', drive_folder_url: null, created_at: '' },
  },
]

const DEMO_ENTREGAS: EntregaWithJob[] = [
  {
    id: 'e1', job_id: 'j1', nome: 'Edicao Principal', tag: 'edicao', concluida: false,
    posicao: 0, status_slug: 'check_in', data_entrega: '2026-03-12', hora_entrega_cliente: null,
    margem_horas: 4, produzindo_por: null, aprovado_interno: false, aprovado_interno_por: null, created_at: '',
    job: { ...DEMO_JOBS[0], cliente: DEMO_CLIENTES[0] } as Job & { cliente: typeof DEMO_CLIENTES[0] },
  },
  {
    id: 'e2', job_id: 'j1', nome: 'Color Grading', tag: 'color', concluida: false,
    posicao: 1, status_slug: 'producao', data_entrega: '2026-03-12', hora_entrega_cliente: null,
    margem_horas: 4, produzindo_por: null, aprovado_interno: false, aprovado_interno_por: null, created_at: '',
    job: { ...DEMO_JOBS[0], cliente: DEMO_CLIENTES[0] } as Job & { cliente: typeof DEMO_CLIENTES[0] },
  },
  {
    id: 'e3', job_id: 'j2', nome: 'Video 30s', tag: null, concluida: false,
    posicao: 0, status_slug: 'check_in', data_entrega: '2026-03-20', hora_entrega_cliente: null,
    margem_horas: 4, produzindo_por: null, aprovado_interno: false, aprovado_interno_por: null, created_at: '',
    job: { ...DEMO_JOBS[1], cliente: DEMO_CLIENTES[1] } as Job & { cliente: typeof DEMO_CLIENTES[1] },
  },
  {
    id: 'e4', job_id: 'j2', nome: 'Versao Stories', tag: null, concluida: false,
    posicao: 1, status_slug: 'revisao_interna', data_entrega: '2026-03-20', hora_entrega_cliente: null,
    margem_horas: 4, produzindo_por: null, aprovado_interno: false, aprovado_interno_por: null, created_at: '',
    job: { ...DEMO_JOBS[1], cliente: DEMO_CLIENTES[1] } as Job & { cliente: typeof DEMO_CLIENTES[1] },
  },
]

export default async function BoardPage() {
  let colunas = DEMO_COLUNAS
  let jobs = DEMO_JOBS
  let entregas: EntregaWithJob[] = DEMO_ENTREGAS
  let clientes = DEMO_CLIENTES
  let membros: Profile[] = []
  let currentUserId = ''

  if (!isDemoMode) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const [colunasRes, entregasRes, jobsRes, clientesRes, membrosRes, userRes] = await Promise.all([
      supabase.from('colunas').select('*').order('posicao'),
      supabase.from('entregas').select('*, job:jobs(*, cliente:clientes(*))').order('posicao'),
      supabase.from('jobs').select('*, cliente:clientes(*), entregas(*)').order('posicao'),
      supabase.from('clientes').select('*').order('nome'),
      supabase.from('profiles').select('id, nome, email, avatar_url, status, status_texto, status_updated_at, cargo').order('nome'),
      supabase.auth.getUser(),
    ])

    colunas = colunasRes.data ?? DEMO_COLUNAS
    entregas = (entregasRes.data ?? DEMO_ENTREGAS) as EntregaWithJob[]
    jobs = (jobsRes.data ?? DEMO_JOBS) as Job[]
    clientes = clientesRes.data ?? DEMO_CLIENTES
    membros = (membrosRes.data ?? []) as Profile[]
    currentUserId = userRes.data?.user?.id ?? ''
  }

  return <BoardClient colunas={colunas} entregas={entregas} jobs={jobs} clientes={clientes} membros={membros} currentUserId={currentUserId} />
}
