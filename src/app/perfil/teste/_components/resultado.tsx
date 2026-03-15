'use client'

import { useState, useCallback } from 'react'
import type { PersonalidadeResult } from '@/lib/types'
import { ARQUETIPOS, CATEGORIA_NOMES, CATEGORIA_DESC } from '@/lib/arquetipos'

interface ResultadoProps {
  resultado: PersonalidadeResult
  onRefazer: () => void
}

const EIXO_LABELS: Array<{
  key: keyof PersonalidadeResult['scores']
  negativo: string
  positivo: string
  labelNeg: string
  labelPos: string
  corNeg: string
  corPos: string
}> = [
  { key: 'energia', negativo: 'I', positivo: 'E', labelNeg: 'Introvertido', labelPos: 'Extrovertido', corNeg: '#4A90D9', corPos: '#14AE5C' },
  { key: 'percepcao', negativo: 'S', positivo: 'N', labelNeg: 'Observador', labelPos: 'Intuitivo', corNeg: '#FF8C00', corPos: '#9747FF' },
  { key: 'decisao', negativo: 'F', positivo: 'T', labelNeg: 'Emocional', labelPos: 'Racional', corNeg: '#14AE5C', corPos: '#4A90D9' },
  { key: 'estrutura', negativo: 'P', positivo: 'J', labelNeg: 'Explorador', labelPos: 'Planejador', corNeg: '#FF8C00', corPos: '#9747FF' },
  { key: 'identidade', negativo: 'T', positivo: 'A', labelNeg: 'Turbulento', labelPos: 'Assertivo', corNeg: '#E84393', corPos: '#00C2CB' },
]

export function Resultado({ resultado, onRefazer }: ResultadoProps) {
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [secaoAberta, setSecaoAberta] = useState<string | null>('tracos')

  const arq = ARQUETIPOS[resultado.tipo]
  const identidadeSuffix = resultado.identidade === 'assertivo' ? '-A' : '-T'

  const salvarPerfil = useCallback(async () => {
    setSalvando(true)
    setErro(null)
    try {
      const response = await fetch('/api/membros/personalidade', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resultado),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      setSalvo(true)
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }, [resultado])

  function toggleSecao(id: string) {
    setSecaoAberta(secaoAberta === id ? null : id)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        {/* Hero card */}
        <div
          className="relative rounded-2xl border border-border overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${resultado.cor}08 0%, ${resultado.cor}20 100%)` }}
        >
          <div className="h-1.5" style={{ backgroundColor: resultado.cor }} />

          <div className="p-8 space-y-6">
            {/* Category badge */}
            <div className="flex justify-center">
              <span
                className="px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider"
                style={{
                  backgroundColor: `${resultado.cor}18`,
                  color: resultado.cor,
                }}
              >
                {CATEGORIA_NOMES[resultado.categoria]}
              </span>
            </div>

            {/* Icon + Name */}
            <div className="text-center space-y-2">
              <span className="text-6xl block">{arq?.icone || '🎬'}</span>
              <h1 className="text-3xl md:text-4xl font-display italic font-bold text-text-primary">
                {resultado.arquetipo}
              </h1>
              <p className="text-text-muted text-sm font-mono">
                {resultado.tipo}{identidadeSuffix}
              </p>
              {arq && (
                <p className="text-text-secondary text-sm">{arq.subtitulo}</p>
              )}
            </div>

            {/* Quote */}
            {arq && (
              <div className="text-center">
                <p className="text-text-secondary italic text-base">{arq.fraseChave}</p>
              </div>
            )}

            {/* Description */}
            <p className="text-text-secondary text-center text-base leading-relaxed">
              {resultado.descricao}
            </p>

            {/* Identity badge */}
            <div className="flex justify-center">
              <div
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: resultado.identidade === 'assertivo' ? '#00C2CB15' : '#E8439315',
                  color: resultado.identidade === 'assertivo' ? '#00C2CB' : '#E84393',
                }}
              >
                {resultado.identidade === 'assertivo'
                  ? '🛡️ Assertivo — confiante e estavel sob pressao'
                  : '🌊 Turbulento — sensivel, busca sempre melhorar'}
              </div>
            </div>
          </div>
        </div>

        {/* Famous people */}
        {arq && arq.famosos.length > 0 && (
          <div className="bg-bg-card border border-border rounded-xl p-6">
            <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
              Criativos que compartilham seu perfil
            </h3>
            <div className="flex flex-wrap gap-2">
              {arq.famosos.map((famoso) => (
                <span
                  key={famoso}
                  className="px-3 py-1.5 rounded-full text-sm font-medium bg-bg-tertiary text-text-primary border border-border"
                >
                  {famoso}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Collapsible sections */}

        {/* Tracos de personalidade */}
        <SectionToggle
          title="Tracos de personalidade"
          isOpen={secaoAberta === 'tracos'}
          onToggle={() => toggleSecao('tracos')}
        >
          <div className="space-y-5">
            {EIXO_LABELS.map((eixo) => {
              const score = resultado.scores[eixo.key]
              const isPositive = score >= 0
              const dominante = isPositive ? eixo.labelPos : eixo.labelNeg
              const porcentagem = Math.round(50 + (score * 50))
              const corBarra = isPositive ? eixo.corPos : eixo.corNeg

              return (
                <div key={eixo.key} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className={`font-medium ${!isPositive ? 'text-text-primary' : 'text-text-muted'}`}>
                      {eixo.labelNeg}
                    </span>
                    <span className={`font-medium ${isPositive ? 'text-text-primary' : 'text-text-muted'}`}>
                      {eixo.labelPos}
                    </span>
                  </div>
                  <div className="relative h-3 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${porcentagem}%`,
                        backgroundColor: corBarra,
                      }}
                    />
                  </div>
                  <div className="text-center">
                    <span
                      className="text-xs font-semibold"
                      style={{ color: corBarra }}
                    >
                      {porcentagem}% {dominante}
                    </span>
                  </div>
                </div>
              )
            })}

            <p className="text-xs text-text-muted text-center mt-4">
              {CATEGORIA_DESC[resultado.categoria]}
            </p>
          </div>
        </SectionToggle>

        {/* Pontos fortes */}
        {arq && (
          <SectionToggle

            title="Pontos fortes"
            isOpen={secaoAberta === 'fortes'}
            onToggle={() => toggleSecao('fortes')}

          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {arq.pontosFortes.map((ponto, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                  <span className="text-fig-green mt-0.5 flex-shrink-0">+</span>
                  <span>{ponto}</span>
                </div>
              ))}
            </div>
          </SectionToggle>
        )}

        {/* Pontos fracos */}
        {arq && (
          <SectionToggle

            title="Pontos de atencao"
            isOpen={secaoAberta === 'fracos'}
            onToggle={() => toggleSecao('fracos')}

          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {arq.pontosFracos.map((ponto, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                  <span className="text-fig-amber mt-0.5 flex-shrink-0">!</span>
                  <span>{ponto}</span>
                </div>
              ))}
            </div>
          </SectionToggle>
        )}

        {/* Como trabalha */}
        {arq && (
          <SectionToggle

            title="Como trabalha melhor"
            isOpen={secaoAberta === 'trabalha'}
            onToggle={() => toggleSecao('trabalha')}

          >
            <div className="space-y-2">
              {arq.comoTrabalha.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                  <span style={{ color: resultado.cor }} className="mt-0.5 flex-shrink-0">→</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </SectionToggle>
        )}

        {/* Comunicacao */}
        {arq && (
          <SectionToggle

            title="Como se comunicar com esse perfil"
            isOpen={secaoAberta === 'comunica'}
            onToggle={() => toggleSecao('comunica')}

          >
            <p className="text-sm text-text-secondary leading-relaxed">
              {arq.comoComunica}
            </p>
          </SectionToggle>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2 pb-8">
          <button
            onClick={onRefazer}
            className="flex-1 py-3 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-border-hover transition-all font-medium"
          >
            Refazer teste
          </button>

          {salvo ? (
            <div className="flex-1 py-3 rounded-lg bg-fig-green/15 text-fig-green text-center font-medium flex items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Salvo no perfil
            </div>
          ) : (
            <button
              onClick={salvarPerfil}
              disabled={salvando}
              className="flex-1 py-3 rounded-lg text-white font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ backgroundColor: resultado.cor }}
            >
              {salvando ? 'Salvando...' : 'Salvar no meu perfil'}
            </button>
          )}
        </div>

        {erro && (
          <p className="text-fig-red text-sm text-center pb-4">{erro}</p>
        )}
      </div>
    </div>
  )
}

// Collapsible section component
function SectionToggle({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-bg-hover/50 transition-colors"
      >
        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">{title}</h3>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`w-4 h-4 text-text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-5 pb-5 border-t border-border pt-4">
          {children}
        </div>
      )}
    </div>
  )
}
