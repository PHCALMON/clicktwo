'use client'

import { useState } from 'react'

interface ClientLogoProps {
  nome: string
  dominio?: string | null
  cor?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function clientInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

const SIZES = {
  sm: { container: 'w-6 h-6 rounded-md', text: 'text-[9px]' },
  md: { container: 'w-7 h-7 rounded-md', text: 'text-[10px]' },
  lg: { container: 'w-9 h-9 rounded-lg', text: 'text-xs' },
}

export function ClientLogo({ nome, dominio, cor, size = 'md', className = '' }: ClientLogoProps) {
  const [imgError, setImgError] = useState(false)
  const s = SIZES[size]

  // Logo real via Google Favicon API quando tem dominio
  if (dominio && !imgError) {
    return (
      <div className={`${s.container} overflow-hidden flex-shrink-0 flex items-center justify-center ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://www.google.com/s2/favicons?domain=${dominio}&sz=128`}
          alt={nome}
          className="w-full h-full object-cover rounded-[inherit]"
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  // Fallback: iniciais com cor manual ou gradiente padrao
  return (
    <div
      className={`${s.container} flex items-center justify-center flex-shrink-0 ${!cor ? 'bg-gradient-to-br from-accent to-fig-purple' : ''} ${className}`}
      style={cor ? { backgroundColor: cor } : undefined}
    >
      <span className={`${s.text} font-bold text-white leading-none`}>{clientInitials(nome)}</span>
    </div>
  )
}
