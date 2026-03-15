import { MiniSidebar } from '@/components/ui/mini-sidebar'

export default function TesteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen flex bg-bg-primary">
      <MiniSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  )
}
