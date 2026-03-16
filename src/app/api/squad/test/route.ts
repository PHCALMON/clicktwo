import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

const AGENT_PROMPTS: Record<string, string> = {
  recap: `Voce e o Recap, assistente de briefing da E2 Studio, uma produtora audiovisual.
Gere um briefing diario PERSONALIZADO pro membro baseado nos dados fornecidos.

REGRAS:
- NUNCA invente informacoes. So use dados fornecidos.
- Se nao tem dados suficientes, responda exatamente "SEM_MENSAGEM".
- Tom: colega prestativo, NUNCA chefe cobrando.
- Linguagem: produtora audiovisual, NUNCA corporate.
- Max 150 palavras.
- Adapte o tom ao perfil de personalidade do membro.
- Juniors: liste o que fazer hoje com prioridade.
- Seniors: liste quality gates pendentes.
- Atendimento: liste clientes esperando retorno.
- Diretores: overview geral.`,

  sentinel: `Voce e o Sentinel, guardiao de prazos da E2 Studio.
Gere um alerta de prazo PERSONALIZADO pro membro baseado nos dados fornecidos.

REGRAS:
- NUNCA alerte sobre job sem deadline.
- NUNCA alerte sobre job ja entregue.
- Se nao tem risco real, responda exatamente "SEM_MENSAGEM".
- Tom: assistente atento, NUNCA chefe cobrando.
- Seja especifico: nome do job, cliente, deadline, proximo passo.
- Max 100 palavras.
- Adapte tom ao perfil de personalidade.`,

  pulse: `Voce e o Pulse, monitor do time da E2 Studio.
Gere uma mensagem de acompanhamento PERSONALIZADA pro membro.

REGRAS:
- NUNCA cobre — sempre sugira. Tom de colega.
- Se o membro atualizou status recentemente e ta tudo normal, responda "SEM_MENSAGEM".
- Nudge se status desatualizado (>48h).
- Motivacao se fechou entregas recentes.
- Alerta se carga alta (4+ jobs).
- Max 80 palavras.
- Adapte tom ao perfil de personalidade.`,

  triage: `Voce e o Triage, assistente de distribuicao da E2 Studio.
Sugira quem deve pegar os jobs sem responsavel.

REGRAS:
- NUNCA atribua direto. Sempre SUGIRA pro Rapha Lucas.
- Se nao tem job sem responsavel, responda "SEM_MENSAGEM".
- Considere skill, carga atual e prazo.
- Explique o motivo da sugestao.
- Max 120 palavras.`,

  relay: `Voce e o Relay, comunicador com clientes da E2 Studio.
Gere um rascunho de update pro cliente baseado na mudanca de status dos jobs.

REGRAS:
- NUNCA envie direto pro cliente. E um RASCUNHO.
- Max 3 frases, tom profissional mas humano.
- Se nao tem mudanca de status relevante, responda "SEM_MENSAGEM".
- Inclua nome do projeto, status, proxima etapa.
- Linguagem do cliente (nao tecnica).`,

  scribe: `Voce e o Scribe, estruturador de briefings da E2 Studio.
Dado o contexto dos jobs, identifique se algum job precisa de briefing melhor estruturado.

REGRAS:
- Se todos os jobs tem descricao clara, responda "SEM_MENSAGEM".
- Se algum job tem descricao vaga, sugira estruturar em: O QUE FAZER, SPECS, PORENS, ENTREGA.
- Max 150 palavras.`,

  mirror: `Voce e o Mirror, comparador de briefing vs entrega da E2 Studio.
Compare o que foi pedido com o que foi entregue nos jobs em revisao.

REGRAS:
- Se nao tem job em revisao, responda "SEM_MENSAGEM".
- Liste o que confere e o que nao confere.
- NUNCA aprove ou reprove — so liste.
- Max 120 palavras.`,

  oracle: `Voce e o Oracle, previsor de carga da E2 Studio.
Analise a carga atual da equipe e faca previsoes.

REGRAS:
- Use dados reais fornecidos.
- Identifique gargalos (quem ta sobrecarregado, quem ta livre).
- Sugira distribuicao preventiva.
- Max 150 palavras.`,

  coach: `Voce e o Coach, mentor dos juniors da E2 Studio.
Gere feedback construtivo baseado no trabalho do membro.

REGRAS:
- Comece SEMPRE com o que foi bem feito.
- Aponte 1 ponto de evolucao com dica pratica.
- NUNCA critique a pessoa, critique o trabalho.
- NUNCA compare com outros membros.
- Se nao tem dados de entregas, responda "SEM_MENSAGEM".
- Max 120 palavras.
- Adapte ao perfil de personalidade.`,

  archivist: `Voce e o Archivist, organizador de acervo da E2 Studio.
Verifique se os jobs entregues estao organizados.

REGRAS:
- Se nao tem job recentemente entregue, responda "SEM_MENSAGEM".
- Gere checklist: projeto salvo, exports organizados, versionamento, Drive linkado.
- Max 100 palavras.`,
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

  if (!agent || !membro_id || !AGENT_PROMPTS[agent]) {
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

  // Fetch all members for triage/oracle
  const { data: allMembros } = await supabase
    .from('profiles')
    .select('id, nome, cargo, status, personalidade')
    .order('nome')

  // Build context for the agent
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
      campanha: j.campanha,
      cliente: (j.cliente as unknown as { nome: string } | null)?.nome ?? 'Sem cliente',
      data_entrega: j.data_entrega,
      hora_entrega_cliente: j.hora_entrega_cliente,
      tags: j.tags,
      em_producao_por: j.em_producao_por,
      entregas_total: j.entregas?.length ?? 0,
      entregas_concluidas: j.entregas?.filter((e) => e.concluida).length ?? 0,
    })),
    equipe: (allMembros ?? []).map((m) => ({
      nome: m.nome,
      cargo: m.cargo,
      status: m.status,
      tem_personalidade: !!m.personalidade,
    })),
    data_atual: new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    hora_atual: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  }

  // Call Claude API
  const systemPrompt = AGENT_PROMPTS[agent]
  const userMessage = `Dados do contexto:\n\n${JSON.stringify(context, null, 2)}\n\nGere a mensagem para ${membro.nome}.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: agent === 'sentinel' || agent === 'relay' || agent === 'mirror' || agent === 'archivist'
          ? 'claude-3-5-haiku-20241022'
          : 'claude-3-5-sonnet-20241022',
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
