'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Nota } from '@/lib/types'

interface NotesPanelContentProps {
  visible: boolean
  onCountChange: (count: number) => void
}

export function NotesPanelContent({ visible, onCountChange }: NotesPanelContentProps) {
  const [notas, setNotas] = useState<Nota[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loaded, setLoaded] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedNota = notas.find((n) => n.id === selectedId) ?? null

  // Load notas once
  useEffect(() => {
    if (loaded) return
    async function load() {
      try {
        const res = await fetch('/api/notas')
        if (res.ok) {
          const data = await res.json()
          setNotas(data)
          if (data.length > 0) setSelectedId(data[0].id)
          setLoaded(true)
        }
      } catch (err) {
        console.error('[NotesPanel] Load error:', err)
      }
    }
    load()
  }, [loaded])

  // Report count
  useEffect(() => {
    onCountChange(notas.length)
  }, [notas.length, onCountChange])

  const saveNota = useCallback(async (id: string, updates: Partial<Nota>) => {
    await fetch(`/api/notas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
  }, [])

  const debouncedSave = useCallback((id: string, updates: Partial<Nota>) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => saveNota(id, updates), 800)
  }, [saveNota])

  const handleTituloChange = useCallback((titulo: string) => {
    if (!selectedId) return
    setNotas((prev) => prev.map((n) => (n.id === selectedId ? { ...n, titulo } : n)))
    debouncedSave(selectedId, { titulo })
  }, [selectedId, debouncedSave])

  const handleConteudoChange = useCallback((conteudo: string) => {
    if (!selectedId) return
    setNotas((prev) => prev.map((n) => (n.id === selectedId ? { ...n, conteudo } : n)))
    debouncedSave(selectedId, { conteudo })
  }, [selectedId, debouncedSave])

  const createNota = useCallback(async () => {
    const res = await fetch('/api/notas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: 'Sem titulo' }),
    })
    if (res.ok) {
      const created = await res.json()
      setNotas((prev) => [created, ...prev])
      setSelectedId(created.id)
    }
  }, [])

  const deleteNota = useCallback(async (id: string) => {
    setNotas((prev) => {
      const remaining = prev.filter((n) => n.id !== id)
      if (selectedId === id) {
        setSelectedId(remaining[0]?.id ?? null)
      }
      return remaining
    })
    await fetch(`/api/notas/${id}`, { method: 'DELETE' })
  }, [selectedId])

  const toggleChecklistItem = useCallback((lineIndex: number) => {
    if (!selectedNota) return
    const lines = selectedNota.conteudo.split('\n')
    const line = lines[lineIndex]
    if (line.startsWith('- [ ] ')) {
      lines[lineIndex] = line.replace('- [ ] ', '- [x] ')
    } else if (line.startsWith('- [x] ')) {
      lines[lineIndex] = line.replace('- [x] ', '- [ ] ')
    }
    handleConteudoChange(lines.join('\n'))
  }, [selectedNota, handleConteudoChange])

  const filteredNotas = search
    ? notas.filter((n) =>
        n.titulo.toLowerCase().includes(search.toLowerCase()) ||
        n.conteudo.toLowerCase().includes(search.toLowerCase())
      )
    : notas

  const checklistLines = selectedNota
    ? selectedNota.conteudo.split('\n').map((line, i) => ({
        index: i,
        isCheckItem: line.startsWith('- [ ] ') || line.startsWith('- [x] '),
        checked: line.startsWith('- [x] '),
        label: line.replace(/^- \[[ x]\] /, ''),
      })).filter((l) => l.isCheckItem)
    : []

  if (!visible) return null

  return (
    <div className="fixed bottom-[60px] right-4 z-40 w-[420px] h-[500px] bg-bg-elevated border border-border rounded-xl shadow-elevated flex flex-col overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg-secondary/50">
        <span className="text-sm font-semibold text-text-primary">Notas</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-[140px] shrink-0 border-r border-border bg-bg-secondary/30 flex flex-col">
          <div className="p-2">
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-bg-primary border border-border rounded-md px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex-1 overflow-y-auto px-1">
            {filteredNotas.map((nota) => (
              <button
                key={nota.id}
                onClick={() => setSelectedId(nota.id)}
                className={`w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors mb-0.5 group ${
                  selectedId === nota.id
                    ? 'bg-accent/15 text-accent font-medium'
                    : 'text-text-primary hover:bg-bg-tertiary'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{nota.titulo || 'Sem titulo'}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNota(nota.id) }}
                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 transition-all shrink-0 ml-1"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={createNota}
            className="m-2 px-2 py-1.5 text-xs font-medium text-accent hover:bg-accent/10 rounded-md transition-colors border border-accent/30"
          >
            + Nova
          </button>
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedNota ? (
            <>
              <input
                type="text"
                value={selectedNota.titulo}
                onChange={(e) => handleTituloChange(e.target.value)}
                className="px-4 pt-3 pb-1 bg-transparent text-sm font-semibold text-text-primary focus:outline-none border-b border-border/50"
                placeholder="Titulo..."
              />
              <textarea
                value={selectedNota.conteudo}
                onChange={(e) => handleConteudoChange(e.target.value)}
                className="flex-1 px-4 py-2 bg-transparent text-sm text-text-primary resize-none focus:outline-none leading-relaxed"
                placeholder={'Escreva aqui...\n\nUse - [ ] para checklists'}
              />
              {checklistLines.length > 0 && (
                <div className="border-t border-border px-4 py-2 max-h-28 overflow-y-auto bg-bg-secondary/30">
                  <span className="text-[10px] text-text-muted uppercase font-medium">Checklist</span>
                  {checklistLines.map((item) => (
                    <button
                      key={item.index}
                      onClick={() => toggleChecklistItem(item.index)}
                      className="flex items-center gap-2 w-full text-left py-0.5"
                    >
                      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                        item.checked ? 'bg-accent border-accent text-bg-primary' : 'border-text-muted'
                      }`}>
                        {item.checked && (
                          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                        )}
                      </span>
                      <span className={`text-xs ${item.checked ? 'line-through text-text-muted' : 'text-text-primary'}`}>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-text-muted">Selecione ou crie uma nota</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
