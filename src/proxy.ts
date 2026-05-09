import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const dashboardPaths = ['/dashboard']
const legacyProtectedPaths = ['/planner', '/admin']

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('next', request.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith('sb-') && cookie.name.includes('auth-token'))
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isDashboardPath = dashboardPaths.some((path) => pathname.startsWith(path))
  const isLegacyPath = legacyProtectedPaths.some((path) => pathname.startsWith(path))
  const isProtected = isDashboardPath || isLegacyPath

  if (!isProtected) {
    return NextResponse.next()
  }

  const legacyAuthCookie = request.cookies.get('uttf_session')
  if (isLegacyPath && legacyAuthCookie?.value === 'authorized') {
    return NextResponse.next()
  }

  if (!hasSupabaseAuthCookie(request)) {
    return redirectToLogin(request)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return redirectToLogin(request)
  }

  let response = NextResponse.next({ request })
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return redirectToLogin(request)
  }

  return response
}

// Applichiamo il proxy solo alle rotte che ci interessano
export const config = {
  matcher: ['/dashboard/:path*', '/planner/:path*', '/admin/:path*'],
}
