import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

const AGENT_IDS = ['recap', 'sentinel', 'pulse', 'triage', 'relay', 'scribe', 'mirror', 'oracle', 'coach', 'archivist']

const AGENT_MODELS: Record<string, string> = {
  sentinel: 'claude-haiku-4-5-20251001',
  relay: 'claude-haiku-4-5-20251001',
  mirror: 'claude-haiku-4-5-20251001',
  archivist: 'claude-haiku-4-5-20251001',
  scribe: 'claude-haiku-4-5-20251001',
  recap: 'claude-sonnet-4-20250514',
  pulse: 'claude-sonnet-4-20250514',
  triage: 'claude-sonnet-4-20250514',
  oracle: 'claude-sonnet-4-20250514',
  coach: 'claude-sonnet-4-20250514',
}

async function loadAgentPrompt(agentId: string): Promise<string> {
  // Try multiple paths (dev vs production)
  const paths = [
    join(process.cwd(), 'squads', 'vigilia', 'agents', `${agentId}.md`),
    join(process.cwd(), '..', '..', 'squads', 'vigilia', 'agents', `${agentId}.md`),
    join('/opt/clicktwo', 'squads', 'vigilia', 'agents', `${agentId}.md`),
  ]

  for (const p of paths) {
    try {
      const content = await readFile(p, 'utf-8')
      return content
    } catch {
      continue
    }
  }

  return `Voce e o agente ${agentId} do Squad Vigilia da E2 Studio, uma produtora audiovisual. Gere mensagens personalizadas baseado nos dados fornecidos. Se nao tem dados suficientes, responda "SEM_MENSAGEM".`
}

export async function POST(request: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY nao configurada' }, { status: 500 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { agent, membro_id } = await request.json()

  if (!agent || !membro_id || !AGENT_IDS.includes(agent)) {
    return NextResponse.json({ error: 'agent e membro_id obrigatorios' }, { status: 400 })
  }

  // Fetch member data
  const { data: membro } = await supabase
    .from('profiles')
    .select('id, nome, email, cargo, personalidade, status, status_updated_at')
    .eq('id', membro_id)
    .single()

  if (!membro) {
    return NextResponse.json({ error: 'Membro nao encontrado' }, { status: 404 })
  }

  // Fetch all jobs
  const { data: allJobs } = await supabase
    .from('jobs')
    .select('id, campanha, status, data_entrega, hora_entrega_cliente, tags, coluna_id, em_producao_por, cliente:clientes(nome), entregas(id, nome, concluida, tag)')
    .order('posicao')

  const jobs = allJobs ?? []

  // Fetch all members
  const { data: allMembros } = await supabase
    .from('profiles')
    .select('id, nome, cargo, status, personalidade')
    .order('nome')

  // Fetch colunas for context
  const { data: colunas } = await supabase
    .from('colunas')
    .select('id, nome, cor')
    .order('posicao')

  // Build context
  const context: Record<string, unknown> = {
    membro: {
      nome: membro.nome,
      email: membro.email,
      cargo: membro.cargo,
      personalidade: membro.personalidade,
      status: membro.status,
      status_updated_at: membro.status_updated_at,
    },
    jobs_total: jobs.length,
    jobs_ativos: jobs.map((j) => ({
      id: j.id,
      campanha: j.campanha,
      cliente: (j.cliente as unknown as { nome: string } | null)?.nome ?? 'Sem cliente',
      data_entrega: j.data_entrega,
      hora_entrega_cliente: j.hora_entrega_cliente,
      tags: j.tags,
      coluna: colunas?.find((c) => c.id === j.coluna_id)?.nome ?? 'Desconhecida',
      em_producao_por: j.em_producao_por,
      entregas_total: j.entregas?.length ?? 0,
      entregas_concluidas: j.entregas?.filter((e) => e.concluida).length ?? 0,
    })),
    equipe: (allMembros ?? []).map((m) => ({
      id: m.id,
      nome: m.nome,
      cargo: m.cargo,
      status: m.status,
      tem_personalidade: !!m.personalidade,
      jobs_ativos: jobs.filter((j) => j.coluna_id && j.em_producao_por === m.id).length,
    })),
    colunas: colunas?.map((c) => ({ nome: c.nome, cor: c.cor })) ?? [],
    data_atual: new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    hora_atual: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  }

  // Load agent prompt from .md file (includes Voice DNA, Thinking DNA, examples)
  const agentPrompt = await loadAgentPrompt(agent)

  const systemPrompt = `${agentPrompt}

---

INSTRUCAO DE EXECUCAO:
Baseado no seu perfil completo acima (identidade, regras, Voice DNA, Thinking DNA, exemplos), gere UMA mensagem para o membro indicado.

REGRAS ABSOLUTAS:
- Use APENAS os dados fornecidos no contexto. NUNCA invente informacoes.
- Se nao tem dados suficientes, responda EXATAMENTE "SEM_MENSAGEM" (nada mais).
- Max 150 palavras na mensagem.
- Adapte o tom ao perfil de personalidade do membro (se disponivel).
- Siga estritamente os exemplos positivos e EVITE os exemplos negativos do seu perfil.
- Responda APENAS com a mensagem. Sem prefixos, sem JSON, sem explicacoes.`

  const userMessage = `Dados do contexto atual:\n\n${JSON.stringify(context, null, 2)}\n\nGere a mensagem para ${membro.nome}.`

  try {
    const model = AGENT_MODELS[agent] ?? 'claude-sonnet-4-20250514'

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        temperature: 0.4,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!res.ok) {
      const errData = await res.json()
      return NextResponse.json({ error: `Claude API: ${errData.error?.message || res.status}` }, { status: 500 })
    }

    const data = await res.json()
    const mensagem = data.content?.[0]?.text ?? 'SEM_MENSAGEM'

    return NextResponse.json({
      mensagem,
      agent,
      membro: membro.nome,
      model: data.model,
      context,
    })
  } catch (err) {
    return NextResponse.json({
      error: `Erro ao chamar Claude: ${err instanceof Error ? err.message : 'unknown'}`,
    }, { status: 500 })
  }
}
