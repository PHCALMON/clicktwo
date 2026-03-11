import { Header } from '@/components/ui/header'

export default function ProducaoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen flex flex-col bg-bg-primary">
      <Header />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
