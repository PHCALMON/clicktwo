import { MiniSidebar } from '@/components/ui/mini-sidebar'

export default function ProducaoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen flex bg-bg-primary">
      <MiniSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
