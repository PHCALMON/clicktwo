'use client'

import { useState } from 'react'
import type { Coluna, Cliente, TipoJob, Prioridade, TagJob, Job } from '@/lib/types'
import { TIPOS_JOB, PRIORIDADES, TAGS } from '@/lib/constants'

interface NewJobModalProps {
  colunas: Coluna[]
  clientes: Cliente[]
  onClose: () => void
  onSubmit: (job: Partial<Job>) => void
  onNewCliente?: (nome: string) => Promise<Cliente | null>
}

export function NewJobModal({ colunas, clientes, onClose, onSubmit, onNewCliente }: NewJobModalProps) {
  const [campanha, setCampanha] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [showNewCliente, setShowNewCliente] = useState(false)
  const [newClienteNome, setNewClienteNome] = useState('')
  const [creatingCliente, setCreatingCliente] = useState(false)
  const [tipoJob, setTipoJob] = useState<TipoJob>('publicidade')
  const [colunaId, setColunaId] = useState(colunas[0]?.id ?? '')
  const [dataEntrega, setDataEntrega] = useState('')
  const [prioridade, setPrioridade] = useState<Prioridade>('normal')
  const [selectedTags, setSelectedTags] = useState<TagJob[]>([])
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
      prioridade,
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
              <div className="flex gap-2 mt-2">
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
                    const created = await onNewCliente(newClienteNome.trim())
                    setCreatingCliente(false)
                    if (created) {
                      setClienteId(created.id)
                      setShowNewCliente(false)
                      setNewClienteNome('')
                    }
                  }}
                  className="px-3 py-2 bg-accent text-bg-primary text-xs font-semibold rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  {creatingCliente ? '...' : 'Criar'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewCliente(false); setNewClienteNome('') }}
                  className="px-2 py-2 text-xs text-text-secondary hover:text-text-primary"
                >
                  Cancelar
                </button>
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
              placeholder="Ex: Campanha XP, Vídeo institucional..."
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

          {/* Data + Prioridade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Data de Entrega</label>
              <input
                type="date"
                value={dataEntrega}
                onChange={(e) => setDataEntrega(e.target.value)}
                className="w-full px-3 py-2 bg-bg-card border border-border rounded-md text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Prioridade</label>
              <select
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as Prioridade)}
                className="w-full px-3 py-2 bg-bg-card border border-border rounded-md text-text-primary focus:outline-none focus:border-accent"
              >
                {Object.entries(PRIORIDADES).map(([value, config]) => (
                  <option key={value} value={value}>{config.label}</option>
                ))}
              </select>
            </div>
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
