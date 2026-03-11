'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Notificacao } from '@/lib/types'

// Persistent AudioContext — warmed up on first user interaction
let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

// Warm up on first click anywhere
if (typeof window !== 'undefined') {
  const warmUp = () => {
    getAudioContext()
    document.removeEventListener('click', warmUp)
  }
  document.addEventListener('click', warmUp)
}

function playNotificationSound() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    // Soft two-tone chime (like iMessage)
    const notes = [
      { freq: 830, start: 0, dur: 0.12 },      // A5-ish
      { freq: 1245, start: 0.12, dur: 0.18 },   // Fifth above — pleasant interval
    ]

    for (const note of notes) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.value = note.freq

      // Soft attack, smooth decay
      gain.gain.setValueAtTime(0, now + note.start)
      gain.gain.linearRampToValueAtTime(0.4, now + note.start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.start + note.dur)

      osc.connect(gain).connect(ctx.destination)
      osc.start(now + note.start)
      osc.stop(now + note.start + note.dur)
    }
  } catch { /* Audio not available */ }
}

export function NotificationBell() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [toastQueue, setToastQueue] = useState<Notificacao[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  const unreadCount = useMemo(
    () => notificacoes.filter((n) => !n.lida).length,
    [notificacoes]
  )

  // Load notifications on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/notificacoes')
        if (res.ok) {
          const data = await res.json()
          setNotificacoes(data)
        } else {
          console.error('[NotificationBell] Erro ao carregar notificacoes:', res.status)
        }
      } catch (err) {
        console.error('[NotificationBell] Erro de rede:', err)
      }
    }
    load()
  }, [])

  // Realtime: listen for new notifications
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('my-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificacoes' },
        (payload) => {
          const newNotif = payload.new as Notificacao
          setNotificacoes((prev) => [newNotif, ...prev])
          setToastQueue((prev) => [...prev, newNotif])
          playNotificationSound()
        }
      )
      .subscribe((status) => {
        console.log('[NotificationBell] Realtime status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Auto-dismiss toasts
  useEffect(() => {
    if (toastQueue.length === 0) return
    const timer = setTimeout(() => {
      setToastQueue((prev) => prev.slice(1))
    }, 6000)
    return () => clearTimeout(timer)
  }, [toastQueue])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const markAsRead = useCallback(async (id: string) => {
    setNotificacoes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
    )
    await fetch(`/api/notificacoes/${id}`, { method: 'PUT' })
  }, [])

  const markAllAsRead = useCallback(async () => {
    const unread = notificacoes.filter((n) => !n.lida)
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })))
    await Promise.all(
      unread.map((n) => fetch(`/api/notificacoes/${n.id}`, { method: 'PUT' }))
    )
  }, [notificacoes])

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Bell button */}
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="relative p-1.5 text-text-secondary hover:text-text-primary transition-colors"
          title="Notificacoes"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-bg-elevated border border-border rounded-lg shadow-elevated overflow-hidden z-50">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <span className="text-sm font-semibold text-text-primary">Notificacoes</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-accent hover:text-accent-hover transition-colors"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notificacoes.length === 0 ? (
                <p className="p-4 text-sm text-text-muted text-center">
                  Nenhuma notificacao
                </p>
              ) : (
                notificacoes.slice(0, 20).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => markAsRead(n.id)}
                    className={`w-full text-left px-4 py-3 border-b border-border/50 transition-colors ${
                      n.lida
                        ? 'opacity-60'
                        : 'bg-accent/5 hover:bg-accent/10'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.lida && (
                        <span className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />
                      )}
                      <div className={n.lida ? 'ml-4' : ''}>
                        <p className="text-sm text-text-primary">
                          <span className="font-semibold text-accent">
                            {n.autor_nome}
                          </span>{' '}
                          mencionou voce
                          {n.job_campanha && (
                            <>
                              {' '}em{' '}
                              <span className="font-medium">{n.job_campanha}</span>
                            </>
                          )}
                        </p>
                        <span className="text-xs text-text-muted">
                          {formatTimeAgo(n.created_at)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toast popups — fixed position, stacked */}
      {toastQueue.length > 0 && (
        <div className="fixed top-16 right-4 z-[200] flex flex-col gap-3" style={{ pointerEvents: 'auto' }}>
          {toastQueue.map((toast, i) => (
            <div
              key={toast.id}
              style={{
                animation: 'notifSlideIn 0.4s ease-out forwards',
                opacity: 0,
                transform: 'translateX(100%)',
              }}
              className="w-80 bg-bg-elevated border-2 border-accent/50 rounded-lg shadow-elevated p-4"
            >
              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-full bg-accent/20 text-accent text-sm font-bold flex items-center justify-center shrink-0">
                  {toast.autor_nome?.charAt(0)?.toUpperCase() ?? '@'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">
                    <span className="font-bold text-accent">
                      {toast.autor_nome}
                    </span>{' '}
                    mencionou voce
                  </p>
                  {toast.job_campanha && (
                    <p className="text-xs text-text-secondary mt-0.5">
                      em <span className="font-medium">{toast.job_campanha}</span>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setToastQueue((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-text-muted hover:text-text-primary text-lg leading-none"
                >
                  &times;
                </button>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-0.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full"
                  style={{ animation: 'notifProgress 6s linear forwards' }}
                />
              </div>
            </div>
          ))}
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
