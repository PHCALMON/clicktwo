'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { NCLogo } from './nc-logo'

export function Header() {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-14 border-b border-border bg-bg-primary/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <NCLogo size="sm" showLabel />
        <span className="text-xs text-text-muted">E2 STUDIO</span>
      </div>

      <nav className="flex items-center gap-6">
        <a href="/board" className="text-sm text-text-primary hover:text-accent transition-colors font-medium">
          Board
        </a>
        <a href="/producao" className="text-sm text-text-secondary hover:text-accent transition-colors">
          Producao
        </a>
        <a href="/clientes" className="text-sm text-text-secondary hover:text-accent transition-colors">
          Clientes
        </a>
        <button
          onClick={handleLogout}
          className="text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          Sair
        </button>
      </nav>
    </header>
  )
}
