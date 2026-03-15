import { MiniSidebar } from '@/components/ui/mini-sidebar'
import { BottomDock } from '@/components/ui/bottom-dock'

export default function BoardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen flex bg-bg-primary">
      <MiniSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      <BottomDock />
    </div>
  )
}
