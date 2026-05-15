import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth') || pathname.startsWith('/api/sheets-sync') || pathname.startsWith('/api/email-import')) {
    return NextResponse.next()
  }

  const auth = request.cookies.get('auth')
  if (auth?.value === 'granted') {
    return NextResponse.next()
  }

  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
