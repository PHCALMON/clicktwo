import { NextResponse, type NextRequest } from 'next/server'

const isDemoMode = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')

export async function middleware(request: NextRequest) {
  if (isDemoMode) {
    return NextResponse.next()
  }

  const { updateSession } = await import('@/lib/supabase/middleware')
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
