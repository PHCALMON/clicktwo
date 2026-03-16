'use client'

import { useMemo } from 'react'
import type { Coluna, EntregaWithJob } from '@/lib/types'
import { TAGS } from '@/lib/constants'
import { calcPrioridade } from '@/lib/priority'

interface JobListViewProps {
  colunas: Coluna[]
  entregas: EntregaWithJob[]
  onEntregaClick: (entrega: EntregaWithJob) => void
}

export function JobListView({ colunas, entregas, onEntregaClick }: JobListViewProps) {
  const colunasSlugMap = useMemo(() => {
    const map: Record<string, Coluna> = {}
    for (const c of colunas) {
      if (c.slug) map[c.slug] = c
    }
    return map
  }, [colunas])

  return (
    <div className="px-6 py-4 overflow-auto flex-1">
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bg-elevated border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Fase</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Cliente</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Campanha</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Entrega</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Prioridade</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Data</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Tag</th>
            </tr>
          </thead>
          <tbody>
            {entregas.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-text-muted">
                  Nenhuma entrega encontrada.
                </td>
              </tr>
            )}
            {entregas.map((entrega) => {
              const coluna = colunasSlugMap[entrega.status_slug]
              const prioConfig = calcPrioridade(entrega.data_entrega, entrega.hora_entrega_cliente, entrega.margem_horas)
              const formattedDate = entrega.data_entrega
                ? new Date(entrega.data_entrega + 'T00:00:00').toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : ''

              return (
                <tr
                  key={entrega.id}
                  onClick={() => onEntregaClick(entrega)}
                  className="border-b border-border last:border-b-0 hover:bg-bg-elevated/50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-2.5">
                    <span
                      className="inline-block px-2 py-0.5 rounded text-xs font-bold text-white"
                      style={{ backgroundColor: coluna?.cor || '#52525B' }}
                    >
                      {coluna?.nome || entrega.status_slug}
                    </span>
                  </td>

                  <td className="px-4 py-2.5">
                    <span className="text-sm font-medium text-text-primary">
                      {entrega.job?.cliente?.nome || '\u2014'}
                    </span>
                  </td>

                  <td className="px-4 py-2.5">
                    <span className="text-sm text-text-secondary">
                      {entrega.job?.campanha || '\u2014'}
                    </span>
                  </td>

                  <td className="px-4 py-2.5">
                    <span className="text-sm text-text-primary">{entrega.nome}</span>
                  </td>

                  <td className="px-4 py-2.5">
                    <span
                      className="inline-block px-2 py-0.5 rounded text-xs font-bold text-white"
                      style={{ backgroundColor: prioConfig.color }}
                    >
                      {prioConfig.label.toUpperCase()}
                    </span>
                  </td>

                  <td className="px-4 py-2.5">
                    <span className="text-sm text-text-secondary">{formattedDate}</span>
                  </td>

                  <td className="px-4 py-2.5">
                    {entrega.tag && (
                      <span
                        className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
                        style={{ backgroundColor: TAGS[entrega.tag]?.color || '#52525B' }}
                      >
                        {(TAGS[entrega.tag]?.label || entrega.tag).toUpperCase()}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-text-muted mt-3">{entregas.length} entrega(s)</p>
    </div>
  )
}
