'use client'

import { usePathname } from 'next/navigation'
import { NCLogo } from './nc-logo'

const navItems = [
  {
    href: '/board',
    label: 'Board',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/producao',
    label: 'Producao',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
  },
  {
    href: '/clientes',
    label: 'Clientes',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4-4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
]

export function MiniSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-[52px] shrink-0 bg-bg-primary border-r border-border flex flex-col items-center py-4 gap-1">
      <div className="mb-6">
        <NCLogo size="sm" />
      </div>

      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
        return (
          <a
            key={item.href}
            href={item.href}
            title={item.label}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
              isActive
                ? 'bg-accent/15 text-accent'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            {item.icon}
          </a>
        )
      })}

      <div className="mt-auto">
        <LogoutButton />
      </div>
    </aside>
  )
}

function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="POST">
      <button
        type="button"
        onClick={async () => {
          const { createClient } = await import('@/lib/supabase/client')
          const supabase = createClient()
          await supabase.auth.signOut()
          window.location.href = '/login'
        }}
        title="Sair"
        className="w-9 h-9 rounded-lg flex items-center justify-center text-text-muted hover:text-fig-red hover:bg-fig-red/10 transition-all"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </form>
  )
}
