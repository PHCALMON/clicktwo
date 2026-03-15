'use client'

import { useState, useMemo } from 'react'
import type { Coluna, Cliente, TipoJob, TagJob, Job } from '@/lib/types'
import { TIPOS_JOB, TAGS } from '@/lib/constants'
import { calcPrioridade } from '@/lib/priority'

interface NewJobModalProps {
  colunas: Coluna[]
  clientes: Cliente[]
  onClose: () => void
  onSubmit: (job: Partial<Job>) => void
  onNewCliente?: (nome: string, cor?: string) => Promise<Cliente | null>
}

export function NewJobModal({ colunas, clientes, onClose, onSubmit, onNewCliente }: NewJobModalProps) {
  const [campanha, setCampanha] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [showNewCliente, setShowNewCliente] = useState(false)
  const [newClienteNome, setNewClienteNome] = useState('')
  const [newClienteCor, setNewClienteCor] = useState('')
  const [creatingCliente, setCreatingCliente] = useState(false)
  const [tipoJob, setTipoJob] = useState<TipoJob>('publicidade')
  const [colunaId, setColunaId] = useState(colunas[0]?.id ?? '')
  const [dataEntrega, setDataEntrega] = useState('')
  const [horaCliente, setHoraCliente] = useState('')
  const [margemHoras, setMargemHoras] = useState('4')
  const [selectedTags, setSelectedTags] = useState<TagJob[]>([])

  const prioPreview = useMemo(
    () => calcPrioridade(dataEntrega || null, horaCliente || null, parseInt(margemHoras) || null),
    [dataEntrega, horaCliente, margemHoras],
  )

  function toggleTag(tag: TagJob) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      campanha,
      cliente_id: clienteId,
      tipo_job: tipoJob,
      coluna_id: colunaId,
      data_entrega: dataEntrega || null,
      hora_entrega_cliente: horaCliente || null,
      margem_horas: parseInt(margemHoras) || 4,
      prioridade: 'normal',
      tags: selectedTags,
      drive_folder_url: null,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-bg-elevated border border-border rounded-lg shadow-elevated w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-text-primary">Novo Job</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Cliente</label>
            <div className="flex gap-2">
              <select
                value={clienteId}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setShowNewCliente(true)
                  } else {
                    setClienteId(e.target.value)
                  }
                }}
                required={!showNewCliente}
                className="flex-1 px-3 py-2 bg-bg-card border border-border rounded-md text-text-primary focus:outline-none focus:border-accent"
              >
                <option value="">Selecione...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
                {onNewCliente && <option value="__new__">+ Novo cliente...</option>}
              </select>
            </div>
            {showNewCliente && (
              <div className="mt-2 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newClienteNome}
                  onChange={(e) => setNewClienteNome(e.target.value)}
                  placeholder="Nome do novo cliente"
                  autoFocus
                  className="flex-1 px-3 py-2 bg-bg-card border border-border rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:border-accent text-sm"
                />
                <button
                  type="button"
                  disabled={creatingCliente || !newClienteNome.trim()}
                  onClick={async () => {
                    if (!onNewCliente || !newClienteNome.trim()) return
                    setCreatingCliente(true)
                    const created = await onNewCliente(newClienteNome.trim(), newClienteCor || undefined)
                    setCreatingCliente(false)
                    if (created) {
                      setClienteId(created.id)
                      setShowNewCliente(false)
                      setNewClienteNome('')
                      setNewClienteCor('')
                    }
                  }}
                  className="px-3 py-2 bg-accent text-bg-primary text-xs font-semibold rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  {creatingCliente ? '...' : 'Criar'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewCliente(false); setNewClienteNome(''); setNewClienteCor('') }}
                  className="px-2 py-2 text-xs text-text-secondary hover:text-text-primary"
                >
                  Cancelar
                </button>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-text-muted">Cor do cliente:</label>
                <div className="flex gap-1.5">
                  {['#4A90D9', '#9747FF', '#E84393', '#FF8C00', '#14AE5C', '#EF4444', '#FFCD29', '#00C2CB'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewClienteCor(c)}
                      className={`w-6 h-6 rounded-md border-2 transition-all ${newClienteCor === c ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              </div>
            )}
          </div>

          {/* Campanha */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Campanha / Job</label>
            <input
              type="text"
              value={campanha}
              onChange={(e) => setCampanha(e.target.value)}
              required
              placeholder="Ex: Campanha XP, Video institucional..."
              className="w-full px-3 py-2 bg-bg-card border border-border rounded-md text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
            />
          </div>

          {/* Tipo + Coluna */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Tipo de Job</label>
              <select
                value={tipoJob}
                onChange={(e) => setTipoJob(e.target.value as TipoJob)}
                className="w-full px-3 py-2 bg-bg-card border border-border rounded-md text-text-primary focus:outline-none focus:border-accent"
              >
                {Object.entries(TIPOS_JOB).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Coluna</label>
              <select
                value={colunaId}
                onChange={(e) => setColunaId(e.target.value)}
                className="w-full px-3 py-2 bg-bg-card border border-border rounded-md text-text-primary focus:outline-none focus:border-accent"
              >
                {colunas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Data de Entrega + Hora + Margem + Preview */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Prazo de Entrega</label>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={dataEntrega}
                onChange={(e) => setDataEntrega(e.target.value)}
                required
                className="flex-1 min-w-[140px] px-3 py-2 bg-bg-card border border-border rounded-md text-text-primary focus:outline-none focus:border-accent"
              />
              <input
                type="time"
                value={horaCliente}
                onChange={(e) => setHoraCliente(e.target.value)}
                placeholder="Hora"
                className="px-2 py-2 bg-bg-card border border-border rounded-md text-sm text-text-primary focus:outline-none focus:border-accent [color-scheme:dark]"
                title="Hora que o cliente precisa receber"
              />
              <select
                value={margemHoras}
                onChange={(e) => setMargemHoras(e.target.value)}
                className="px-2 py-2 bg-bg-card border border-border rounded-md text-sm text-text-primary focus:outline-none focus:border-accent"
                title="Margem de revisao"
              >
                <option value="0">Sem margem</option>
                <option value="2">-2h</option>
                <option value="4">-4h</option>
                <option value="6">-6h</option>
                <option value="8">-8h</option>
              </select>
              {dataEntrega && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs" style={{ backgroundColor: `${prioPreview.color}15` }}>
                  <span
                    className={`w-2 h-2 rounded-full${prioPreview.pulse ? ' animate-pulse' : ''}`}
                    style={{ backgroundColor: prioPreview.color }}
                  />
                  <span style={{ color: prioPreview.color }} className="font-medium">
                    {prioPreview.label}
                  </span>
                  {prioPreview.countdown && (
                    <span style={{ color: prioPreview.color }} className="font-mono font-semibold">
                      {prioPreview.countdown}
                    </span>
                  )}
                </div>
              )}
            </div>
            {horaCliente && (
              <p className="text-xs text-text-muted mt-1">
                Cliente: {horaCliente} &rarr; Prazo interno: {margemHoras !== '0' ? `-${margemHoras}h (com clamp horario comercial)` : 'mesmo horario'}
              </p>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(TAGS) as [TagJob, { label: string; color: string }][]).map(
                ([value, config]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleTag(value)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
                      selectedTags.includes(value)
                        ? 'opacity-100'
                        : 'opacity-40 hover:opacity-70 border-transparent'
                    }`}
                    style={{
                      backgroundColor: `${config.color}20`,
                      color: config.color,
                      borderColor: selectedTags.includes(value) ? config.color : 'transparent',
                    }}
                  >
                    {config.label}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-accent text-bg-primary text-sm font-semibold rounded-md hover:bg-accent-hover transition-colors"
            >
              Criar Job
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
