'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Notificacao } from '@/lib/types'

// Audio context for notification sound
let audioCtx: AudioContext | null = null
function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}
if (typeof window !== 'undefined') {
  const warmUp = () => { getAudioContext(); document.removeEventListener('click', warmUp) }
  document.addEventListener('click', warmUp)
}
function playNotificationSound() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime
    const notes = [
      { freq: 830, start: 0, dur: 0.12 },
      { freq: 1245, start: 0.12, dur: 0.18 },
    ]
    for (const note of notes) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = note.freq
      gain.gain.setValueAtTime(0, now + note.start)
      gain.gain.linearRampToValueAtTime(0.4, now + note.start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.start + note.dur)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now + note.start)
      osc.stop(now + note.start + note.dur)
    }
  } catch { /* Audio not available */ }
}

interface NotificationsPanelContentProps {
  visible: boolean
  onCountChange: (count: number) => void
  onOpenJob?: (jobId: string) => void
}

export function NotificationsPanelContent({ visible, onCountChange, onOpenJob }: NotificationsPanelContentProps) {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [toastQueue, setToastQueue] = useState<Notificacao[]>([])

  const unreadCount = useMemo(
    () => notificacoes.filter((n) => !n.lida).length,
    [notificacoes]
  )

  // Report count
  useEffect(() => {
    onCountChange(unreadCount)
  }, [unreadCount, onCountChange])

  // Load on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/notificacoes')
        if (res.ok) setNotificacoes(await res.json())
      } catch (err) {
        console.error('[Notifications] Load error:', err)
      }
    }
    load()
  }, [])

  // Realtime
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('my-notifications-panel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificacoes' }, (payload) => {
        const n = payload.new as Notificacao
        setNotificacoes((prev) => [n, ...prev])
        setToastQueue((prev) => [...prev, n])
        playNotificationSound()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // Auto-dismiss toasts
  useEffect(() => {
    if (toastQueue.length === 0) return
    const timer = setTimeout(() => setToastQueue((prev) => prev.slice(1)), 6000)
    return () => clearTimeout(timer)
  }, [toastQueue])

  const markAsRead = useCallback(async (id: string) => {
    setNotificacoes((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)))
    await fetch(`/api/notificacoes/${id}`, { method: 'PUT' })
  }, [])

  const markAllAsRead = useCallback(async () => {
    const unread = notificacoes.filter((n) => !n.lida)
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })))
    await Promise.all(unread.map((n) => fetch(`/api/notificacoes/${n.id}`, { method: 'PUT' })))
  }, [notificacoes])

  const handleNotifClick = useCallback((n: Notificacao) => {
    markAsRead(n.id)
    if (n.job_id) {
      // Dispatch custom event for BoardClient to open JobDetailModal
      window.dispatchEvent(new CustomEvent('open-job', { detail: { jobId: n.job_id } }))
      onOpenJob?.(n.job_id)
    }
  }, [markAsRead, onOpenJob])

  return (
    <>
      {/* Toast popups — always visible regardless of panel */}
      {toastQueue.length > 0 && (
        <div className="fixed top-16 right-4 z-[200] flex flex-col gap-3">
          {toastQueue.map((toast, i) => (
            <div
              key={toast.id}
              style={{ animation: 'notifSlideIn 0.4s ease-out forwards', opacity: 0, transform: 'translateX(100%)' }}
              className="w-80 bg-bg-elevated border-2 border-accent/50 rounded-lg shadow-elevated p-4"
            >
              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-full bg-accent/20 text-accent text-sm font-bold flex items-center justify-center shrink-0">
                  {toast.autor_nome?.charAt(0)?.toUpperCase() ?? '@'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    <span className="font-bold text-accent">{toast.autor_nome}</span> mencionou voce
                  </p>
                  {toast.job_campanha && (
                    <p className="text-xs text-text-secondary mt-0.5">em <span className="font-medium">{toast.job_campanha}</span></p>
                  )}
                </div>
                <button
                  onClick={() => setToastQueue((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-text-muted hover:text-text-primary text-lg leading-none"
                >&times;</button>
              </div>
              <div className="mt-3 h-0.5 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full" style={{ animation: 'notifProgress 6s linear forwards' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Panel — only visible when active */}
      {visible && (
        <div className="fixed bottom-[60px] right-4 z-40 w-96 bg-bg-elevated border border-border rounded-xl shadow-elevated overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <span className="text-sm font-semibold text-text-primary">Notificacoes</span>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-accent hover:text-accent-hover transition-colors">
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notificacoes.length === 0 ? (
              <p className="p-4 text-sm text-text-muted text-center">Nenhuma notificacao</p>
            ) : (
              notificacoes.slice(0, 30).map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-border/50 transition-colors ${
                    n.lida ? 'opacity-60' : 'bg-accent/5 hover:bg-accent/10'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.lida && <span className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />}
                    <div className={n.lida ? 'ml-4' : ''}>
                      <p className="text-sm text-text-primary">
                        <span className="font-semibold text-accent">{n.autor_nome}</span>{' '}mencionou voce
                        {n.job_campanha && (<>{' '}em <span className="font-medium">{n.job_campanha}</span></>)}
                      </p>
                      <span className="text-xs text-text-muted">{formatTimeAgo(n.created_at)}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </>
  )
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `${minutes}min atras`
  if (hours < 24) return `${hours}h atras`
  if (days < 7) return `${days}d atras`
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}
