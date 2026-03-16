'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Job, Coluna, Comentario, Cliente, Notificacao, Profile, Entrega } from '@/lib/types'

const isDemoMode = typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')

type RealtimeCallbacks = {
  onJobChange?: (payload: { eventType: string; new: Job; old: Job }) => void
  onEntregaChange?: (payload: { eventType: string; new: Entrega; old: Entrega }) => void
  onColunaChange?: (payload: { eventType: string; new: Coluna; old: Coluna }) => void
  onComentarioChange?: (payload: { eventType: string; new: Comentario; old: Comentario }) => void
  onClienteChange?: (payload: { eventType: string; new: Cliente; old: Cliente }) => void
  onNotificacaoChange?: (payload: { eventType: string; new: Notificacao; old: Notificacao }) => void
  onProfileChange?: (payload: { eventType: string; new: Profile; old: Profile }) => void
}

export function useRealtime(callbacks: RealtimeCallbacks) {
  useEffect(() => {
    if (isDemoMode) return

    const supabase = createClient()

    const channel = supabase
      .channel('board-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' },
        (payload) => {
          callbacks.onJobChange?.(payload as unknown as { eventType: string; new: Job; old: Job })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'entregas' },
        (payload) => {
          callbacks.onEntregaChange?.(payload as unknown as { eventType: string; new: Entrega; old: Entrega })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'colunas' },
        (payload) => {
          callbacks.onColunaChange?.(payload as unknown as { eventType: string; new: Coluna; old: Coluna })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comentarios' },
        (payload) => {
          callbacks.onComentarioChange?.(payload as unknown as { eventType: string; new: Comentario; old: Comentario })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clientes' },
        (payload) => {
          callbacks.onClienteChange?.(payload as unknown as { eventType: string; new: Cliente; old: Cliente })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notificacoes' },
        (payload) => {
          callbacks.onNotificacaoChange?.(payload as unknown as { eventType: string; new: Notificacao; old: Notificacao })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          callbacks.onProfileChange?.(payload as unknown as { eventType: string; new: Profile; old: Profile })
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Channel status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [callbacks])
}
