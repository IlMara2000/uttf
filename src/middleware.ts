import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Percorsi da proteggere
  const protectedPaths = ['/planner', '/admin', '/storage']
  const isProtected = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (isProtected) {
    const authCookie = request.cookies.get('uttf_session')

    // Se il cookie non c'è o non è valido, rimanda al login
    if (!authCookie || authCookie.value !== 'authorized') {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

// Applichiamo il middleware solo alle rotte che ci interessano
export const config = {
  matcher: ['/planner/:path*', '/admin/:path*', '/storage/:path*'],
}