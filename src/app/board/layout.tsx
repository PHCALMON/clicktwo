import { Header } from '@/components/ui/header'

export default function BoardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen flex flex-col bg-bg-primary">
      <Header />
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  )
}
