import { NextRequest, NextResponse } from "next/server";

/**
 * Route prefixes that always be allowed
 */
const PUBLIC_PREFIXES = ["/api/auth", "/_next", "/favicon.ico"];

/**
 * Routes that unauthenticated users are allowed to visit.
 * Authenticated users can also visit these — the pages themselves
 * can decide whether to redirect (e.g. via `getOptionalSession`).
 *
 * We deliberately do NOT redirect authenticated users away from these
 * routes in middleware, because middleware can only check for cookie
 * *existence*, not cookie *validity*. Redirecting based on a stale
 * cookie (e.g. after a DB reset) causes an infinite redirect loop.
 */
const AUTH_ROUTES = ["/login", "/sign-up"];

function getSessionToken(request: NextRequest): string | undefined {
    return (
        request.cookies.get("better-auth.session_token")?.value ??
        request.cookies.get("__Secure-better-auth.session_token")?.value
    );
}

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
        return NextResponse.next();
    }

    // Auth routes are always accessible — let the page itself handle
    // redirecting already-authenticated users if desired.
    if (AUTH_ROUTES.includes(pathname)) {
        return NextResponse.next();
    }

    // All other routes require a session cookie to proceed.
    // If the cookie is missing, redirect to /login.
    const sessionToken = getSessionToken(request);

    if (!sessionToken) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
