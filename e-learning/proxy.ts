import { getSessionCookie } from 'better-auth/cookies';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Optimistic auth check.
 *
 * This only looks at the session cookie -- it deliberately does no database
 * work, because proxy runs on every request including prefetches. The real
 * check (is the session valid, does the role match) happens in each page via
 * `requireRole` in `lib/session.ts`.
 */
const PROTECTED_PREFIXES = ['/teacher', '/student'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!isProtected) {
    return NextResponse.next();
  }

  if (!getSessionCookie(request)) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // skip static assets and the auth endpoints themselves
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
