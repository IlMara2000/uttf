import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { password } = await req.json()

  if (password === process.env.ADMIN_PASSWORD) {
    const response = NextResponse.json({ success: true })
    
    // Settiamo un cookie che dura 7 giorni
    response.cookies.set('uttf_session', 'authorized', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  }

  return NextResponse.json({ success: false }, { status: 401 })
}