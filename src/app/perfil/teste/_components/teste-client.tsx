'use client'

import { useState, useCallback } from 'react'
import { Resultado } from '@/app/perfil/teste/_components/resultado'
import type { PersonalidadeResult, Identidade } from '@/lib/types'
import { ARQUETIPOS, COR_CATEGORIA } from '@/lib/arquetipos'

interface Pergunta {
  id: number
  texto: string
  eixo: 'energia' | 'percepcao' | 'decisao' | 'estrutura' | 'identidade'
  polaridade: 1 | -1
}

const PERGUNTAS: Pergunta[] = [
  // Eixo Energia: E(+1) / I(-1)
  { id: 1, texto: 'Prefiro trabalhar em equipe com brainstorm ao vivo do que sozinho com fone', eixo: 'energia', polaridade: 1 },
  { id: 2, texto: 'Quando preciso resolver um problema criativo, penso melhor conversando com alguem', eixo: 'energia', polaridade: 1 },
  { id: 3, texto: 'Me sinto energizado quando o escritorio esta movimentado', eixo: 'energia', polaridade: 1 },
  { id: 4, texto: 'Prefiro apresentar ideias ao vivo do que mandar por mensagem', eixo: 'energia', polaridade: 1 },
  { id: 5, texto: 'No set ou estudio, gosto de estar no meio da acao', eixo: 'energia', polaridade: 1 },

  // Eixo Percepcao: N(+1) / S(-1)
  { id: 6, texto: 'Prefiro experimentar tecnicas novas do que seguir um processo que ja funciona', eixo: 'percepcao', polaridade: 1 },
  { id: 7, texto: 'Quando recebo um briefing, ja imagino o resultado final antes de comecar', eixo: 'percepcao', polaridade: 1 },
  { id: 8, texto: 'Me interesso mais pelo conceito do projeto do que pelos detalhes tecnicos', eixo: 'percepcao', polaridade: 1 },
  { id: 9, texto: 'Gosto de propor ideias que fogem do que o cliente pediu', eixo: 'percepcao', polaridade: 1 },
  { id: 10, texto: 'Acho mais divertido criar algo do zero do que refinar algo existente', eixo: 'percepcao', polaridade: 1 },

  // Eixo Decisao: T(+1) / F(-1)
  { id: 11, texto: 'Priorizo entregar no prazo mesmo que nao esteja 100% como eu queria', eixo: 'decisao', polaridade: 1 },
  { id: 12, texto: 'Feedback tecnico me motiva mais do que elogios pessoais', eixo: 'decisao', polaridade: 1 },
  { id: 13, texto: 'Prefiro seguir um checklist objetivo do que "sentir" se esta bom', eixo: 'decisao', polaridade: 1 },
  { id: 14, texto: 'Quando discordo de uma direcao criativa, falo direto sem rodeios', eixo: 'decisao', polaridade: 1 },
  { id: 15, texto: 'Analiso referencias tecnicamente antes de me deixar inspirar pelo feeling', eixo: 'decisao', polaridade: 1 },

  // Eixo Estrutura: J(+1) / P(-1)
  { id: 16, texto: 'Gosto de planejar meu dia antes de comecar a produzir', eixo: 'estrutura', polaridade: 1 },
  { id: 17, texto: 'Trabalho melhor com deadline apertado do que com prazo folgado', eixo: 'estrutura', polaridade: -1 },
  { id: 18, texto: 'Prefiro terminar um job antes de comecar outro', eixo: 'estrutura', polaridade: 1 },
  { id: 19, texto: 'Me incomoda quando mudam o briefing no meio do caminho', eixo: 'estrutura', polaridade: 1 },
  { id: 20, texto: 'Organizo meus arquivos e projetos de forma metodica', eixo: 'estrutura', polaridade: 1 },

  // Eixo Identidade: Assertivo(+1) / Turbulento(-1)
  { id: 21, texto: 'Fico tranquilo mesmo quando um projeto da errado — sei que da pra resolver', eixo: 'identidade', polaridade: 1 },
  { id: 22, texto: 'Raramente me comparo com o trabalho dos outros da equipe', eixo: 'identidade', polaridade: 1 },
  { id: 23, texto: 'Confio nas minhas decisoes criativas sem ficar revisando depois', eixo: 'identidade', polaridade: 1 },
]

const PERGUNTAS_POR_PAGINA = 6
const TOTAL_PAGINAS = Math.ceil(PERGUNTAS.length / PERGUNTAS_POR_PAGINA)

const OPCOES = [
  { valor: 3, tamanho: 40 },
  { valor: 2, tamanho: 32 },
  { valor: 1, tamanho: 26 },
  { valor: 0, tamanho: 22 },
  { valor: -1, tamanho: 26 },
  { valor: -2, tamanho: 32 },
  { valor: -3, tamanho: 40 },
]

function calcularResultado(respostas: Record<number, number>): PersonalidadeResult {
  const scores = { energia: 0, percepcao: 0, decisao: 0, estrutura: 0, identidade: 0 }
  const counts = { energia: 0, percepcao: 0, decisao: 0, estrutura: 0, identidade: 0 }

  PERGUNTAS.forEach((p) => {
    const resposta = respostas[p.id]
    if (resposta !== undefined) {
      scores[p.eixo] += resposta * p.polaridade
      counts[p.eixo] += 1
    }
  })

  const normalized = {
    energia: counts.energia > 0 ? scores.energia / (counts.energia * 3) : 0,
    percepcao: counts.percepcao > 0 ? scores.percepcao / (counts.percepcao * 3) : 0,
    decisao: counts.decisao > 0 ? scores.decisao / (counts.decisao * 3) : 0,
    estrutura: counts.estrutura > 0 ? scores.estrutura / (counts.estrutura * 3) : 0,
    identidade: counts.identidade > 0 ? scores.identidade / (counts.identidade * 3) : 0,
  }

  const tipo = [
    normalized.energia >= 0 ? 'E' : 'I',
    normalized.percepcao >= 0 ? 'N' : 'S',
    normalized.decisao >= 0 ? 'T' : 'F',
    normalized.estrutura >= 0 ? 'J' : 'P',
  ].join('')

  const identidade: Identidade = normalized.identidade >= 0 ? 'assertivo' : 'turbulento'
  const arq = ARQUETIPOS[tipo]

  return {
    tipo,
    arquetipo: arq.nome,
    categoria: arq.categoria,
    cor: arq.cor,
    descricao: arq.descricao,
    identidade,
    scores: normalized,
    respondido_em: new Date().toISOString(),
  }
}

type Fase = 'intro' | 'perguntas' | 'calculando' | 'resultado'

export function TesteClient() {
  const [fase, setFase] = useState<Fase>('intro')
  const [paginaAtual, setPaginaAtual] = useState(0)
  const [respostas, setRespostas] = useState<Record<number, number>>({})
  const [resultado, setResultado] = useState<PersonalidadeResult | null>(null)

  const perguntasDaPagina = PERGUNTAS.slice(
    paginaAtual * PERGUNTAS_POR_PAGINA,
    (paginaAtual + 1) * PERGUNTAS_POR_PAGINA
  )

  const todasRespondidas = perguntasDaPagina.every((p) => respostas[p.id] !== undefined)
  const totalRespondidas = Object.keys(respostas).length
  const progresso = (totalRespondidas / PERGUNTAS.length) * 100

  const iniciarTeste = useCallback(() => {
    setFase('perguntas')
    setPaginaAtual(0)
    setRespostas({})
    setResultado(null)
  }, [])

  const responder = useCallback((perguntaId: number, valor: number) => {
    setRespostas((prev) => ({ ...prev, [perguntaId]: valor }))
  }, [])

  const proximaPagina = useCallback(() => {
    if (paginaAtual < TOTAL_PAGINAS - 1) {
      setPaginaAtual((prev) => prev + 1)
      // scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      // Last page — calculate
      setFase('calculando')
      setTimeout(() => {
        const res = calcularResultado(respostas)
        setResultado(res)
        setFase('resultado')
      }, 2200)
    }
  }, [paginaAtual, respostas])

  const paginaAnterior = useCallback(() => {
    if (paginaAtual > 0) {
      setPaginaAtual((prev) => prev - 1)
    }
  }, [paginaAtual])

  const refazer = useCallback(() => {
    setFase('intro')
    setPaginaAtual(0)
    setRespostas({})
    setResultado(null)
  }, [])

  // Intro screen
  if (fase === 'intro') {
    return (
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="max-w-lg w-full text-center space-y-8">
          <div className="space-y-2">
            <div className="text-5xl mb-4">🎬</div>
            <h1 className="text-3xl font-bold text-text-primary">
              Descubra seu <span className="font-display italic text-accent">Arquetipo Criativo</span>
            </h1>
            <p className="text-text-secondary text-lg mt-3">
              23 perguntas rapidas sobre como voce trabalha. Sem respostas certas ou erradas.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { cor: COR_CATEGORIA.analistas, label: 'Analistas', desc: 'Estrategia e visao' },
              { cor: COR_CATEGORIA.diplomatas, label: 'Diplomatas', desc: 'Conexao e significado' },
              { cor: COR_CATEGORIA.sentinelas, label: 'Sentinelas', desc: 'Ordem e confiabilidade' },
              { cor: COR_CATEGORIA.exploradores, label: 'Exploradores', desc: 'Acao e adaptabilidade' },
            ].map((cat) => (
              <div key={cat.label} className="bg-bg-card border border-border rounded-lg p-3 text-left">
                <div className="w-2 h-2 rounded-full mb-2" style={{ backgroundColor: cat.cor }} />
                <div className="text-text-primary font-medium">{cat.label}</div>
                <div className="text-text-muted text-xs">{cat.desc}</div>
              </div>
            ))}
          </div>

          <button
            onClick={iniciarTeste}
            className="w-full py-3.5 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold text-lg transition-all active:scale-[0.98]"
          >
            Comecar o teste
          </button>

          <p className="text-text-muted text-xs">Leva menos de 3 minutos</p>
        </div>
      </div>
    )
  }

  // Calculating screen
  if (fase === 'calculando') {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-6">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-border" />
            <div className="absolute inset-0 rounded-full border-4 border-accent border-t-transparent animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-text-primary">Analisando suas respostas...</h2>
            <p className="text-text-secondary text-sm">Calculando seu arquetipo criativo</p>
          </div>
        </div>
      </div>
    )
  }

  // Result screen
  if (fase === 'resultado' && resultado) {
    return <Resultado resultado={resultado} onRefazer={refazer} />
  }

  // Questions page — multiple questions per page (like 16personalities)
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header with progress */}
      <div className="px-6 pt-4 pb-3 border-b border-border">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            {paginaAtual > 0 ? (
              <button
                onClick={paginaAnterior}
                className="text-sm text-text-muted hover:text-text-primary transition-colors flex items-center gap-1"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Anterior
              </button>
            ) : (
              <div />
            )}
            <span className="text-text-muted text-sm font-medium">
              Passo {paginaAtual + 1} de {TOTAL_PAGINAS}
            </span>
          </div>
          <div className="w-full h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out bg-accent"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>
      </div>

      {/* Questions list */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-6 space-y-2">
          {perguntasDaPagina.map((pergunta) => {
            const selected = respostas[pergunta.id]

            return (
              <div key={pergunta.id} className="py-5 border-b border-border last:border-b-0">
                {/* Question text */}
                <p className="text-text-primary font-medium text-base mb-5 leading-relaxed">
                  {pergunta.texto}
                </p>

                {/* Answer circles - Concordo on left, Discordo on right */}
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-fig-green w-16 text-left flex-shrink-0">
                    Concordo
                  </span>

                  <div className="flex items-center justify-center gap-2 md:gap-3 flex-1">
                    {OPCOES.map((opcao) => {
                      const isSelected = selected === opcao.valor
                      const isPositive = opcao.valor > 0
                      const isNegative = opcao.valor < 0
                      let borderColorClass = 'border-border hover:border-border-hover'
                      let hoverBg = 'hover:bg-bg-hover'

                      if (!isSelected) {
                        if (isPositive) {
                          borderColorClass = 'border-fig-green/30 hover:border-fig-green/60'
                          hoverBg = 'hover:bg-fig-green/10'
                        } else if (isNegative) {
                          borderColorClass = 'border-fig-purple/30 hover:border-fig-purple/60'
                          hoverBg = 'hover:bg-fig-purple/10'
                        }
                      }

                      return (
                        <button
                          key={opcao.valor}
                          onClick={() => responder(pergunta.id, opcao.valor)}
                          className={`rounded-full border-2 transition-all duration-150 active:scale-90 flex-shrink-0 ${
                            isSelected
                              ? 'scale-110'
                              : `${borderColorClass} ${hoverBg}`
                          }`}
                          style={{
                            width: opcao.tamanho,
                            height: opcao.tamanho,
                            ...(isSelected
                              ? {
                                  backgroundColor: isPositive ? '#14AE5C' : isNegative ? '#9747FF' : '#6B7280',
                                  borderColor: isPositive ? '#14AE5C' : isNegative ? '#9747FF' : '#6B7280',
                                }
                              : {}),
                          }}
                        />
                      )
                    })}
                  </div>

                  <span className="text-xs font-semibold text-fig-purple w-16 text-right flex-shrink-0">
                    Discordo
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom action */}
      <div className="px-6 py-4 border-t border-border">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={proximaPagina}
            disabled={!todasRespondidas}
            className="w-full py-3 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {paginaAtual === TOTAL_PAGINAS - 1 ? 'Ver meu resultado' : 'Proximo'}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
