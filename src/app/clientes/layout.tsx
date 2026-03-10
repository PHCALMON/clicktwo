import { Header } from '@/components/ui/header'

export default function ClientesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-bg-primary">
      <Header />
      <main>{children}</main>
    </div>
  )
}
