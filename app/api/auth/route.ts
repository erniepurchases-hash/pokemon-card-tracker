import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { password } = await request.json()

  if (password === process.env.APP_PASSWORD) {
    const res = NextResponse.json({ success: true })
    res.cookies.set('auth', 'granted', {
      httpOnly: true,
      secure: true,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })
    return res
  }

  return NextResponse.json({ success: false }, { status: 401 })
}
