'use client'

interface NCLogoProps {
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const sizes = {
  sm: { box: 'w-7 h-7', n: 'text-[11px]', c: 'text-[11px]', label: 'text-sm' },
  md: { box: 'w-9 h-9', n: 'text-[15px]', c: 'text-[15px]', label: 'text-lg' },
  lg: { box: 'w-12 h-12', n: 'text-xl', c: 'text-xl', label: 'text-2xl' },
}

export function NCLogo({ size = 'md', showLabel = false }: NCLogoProps) {
  const s = sizes[size]

  return (
    <div className="flex items-center gap-2.5">
      <div className={`${s.box} bg-gradient-to-br from-accent to-fig-purple rounded-md flex items-center justify-center`}>
        <span className={`${s.n} font-display font-light italic text-white leading-none`}>N</span>
        <span className={`${s.c} font-sans font-extrabold text-white leading-none`}>C</span>
      </div>
      {showLabel && (
        <span className={`${s.label} font-bold text-text-primary tracking-tight`}>
          <span className="font-display font-light italic">Noise</span>
          <span className="font-sans font-extrabold">Cancel</span>
        </span>
      )}
    </div>
  )
}
