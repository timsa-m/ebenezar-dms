import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

// ─── Route Definitions ───────────────────────────────────────────────────────

/**
 * Routes that are fully public — no authentication required.
 * The storefront /inventory is intentionally public for buyer experience.
 */
const PUBLIC_ROUTES = [
  '/inventory',       // public storefront (buyer-facing stock list & vehicle detail)
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/pending-approval',
  '/auth',            // covers /auth/callback (OAuth/magic-link exchange)
];

/**
 * Specifically allowlisted API endpoints that the public customer website or external webhooks access.
 * All other /api routes (uploads, mutations, debug, admin sync) require an authenticated session.
 */
function isPublicApiRoute(pathname: string, method: string): boolean {
  // Public vehicle read endpoints for website storefront
  if (method === 'GET' && (pathname === '/api/vehicles' || pathname.startsWith('/api/vehicles/'))) {
    return true;
  }
  // Public inquiry / lead submissions from website
  if (method === 'POST') {
    if (
      pathname === '/api/contacts' ||
      pathname === '/api/trade-ins' ||
      pathname === '/api/hire-requests' ||
      pathname.startsWith('/api/webhooks/')
    ) {
      return true;
    }
  }
  // Cron endpoints (enforce their own CRON_SECRET header)
  if (pathname.startsWith('/api/cron/') || pathname === '/api/notifications/process') {
    return true;
  }
  return false;
}

/**
 * Auth pages that authenticated users should be bounced away from.
 * Visiting /sign-in when already logged in → redirect to app root.
 */
const AUTH_REDIRECT_ROUTES = [
  '/sign-in',
  '/sign-up',
  '/forgot-password',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isPublic(pathname: string, method: string) {
  if (pathname.startsWith('/api')) {
    return isPublicApiRoute(pathname, method);
  }
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
}

function isAuthRedirect(pathname: string) {
  return AUTH_REDIRECT_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
}

// ─── Proxy ───────────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── CORS for API Routes ────────────────────────────────────────────────────
  if (pathname.startsWith('/api')) {
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }
  }

  /**
   * Build a mutable response that will carry any refreshed session cookies
   * back to the browser. This is the ONLY place token refresh should happen.
   *
   * CRITICAL: Do NOT move code between `createServerClient` and
   * `supabase.auth.getUser()`. The cookie handlers must run in the same
   * synchronous context so that Set-Cookie headers are written correctly.
   */
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // 1. Reflect new cookies onto the request so subsequent middleware
          //    or Server Components that read request.cookies see them.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // 2. Rebuild the response so Set-Cookie headers are sent to the browser.
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  /**
   * Validate the session by calling getUser() (NOT getSession()).
   * getUser() performs a network round-trip to the Supabase Auth server to
   * verify the JWT is still valid, which is required for secure auth gates.
   * getSession() only reads from cookies and is NOT safe for authorization.
   */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Routing logic ───────────────────────────────────────────────────────────

  if (!user) {
    // Unauthenticated: allow only public routes.
    if (!isPublic(pathname, request.method)) {
      if (pathname.startsWith('/api')) {
        return NextResponse.json(
          { error: 'Unauthorized: Authentication required.' },
          { status: 401 }
        );
      }
      const signIn = request.nextUrl.clone();
      signIn.pathname = '/sign-in';
      // Preserve intended destination so AuthForm can redirect back after login.
      signIn.searchParams.set('next', pathname);
      return NextResponse.redirect(signIn);
    }
  } else {
    // Authenticated: bounce users away from auth pages (they're already in).
    if (isAuthRedirect(pathname)) {
      const home = request.nextUrl.clone();
      home.pathname = '/';
      home.search = '';
      return NextResponse.redirect(home);
    }
  }

  /**
   * Return the supabaseResponse — not a plain NextResponse.next() — so that
   * the refreshed Set-Cookie headers are propagated to the client.
   * Replacing this with NextResponse.next() would break token refresh.
   */
  if (pathname.startsWith('/api')) {
    supabaseResponse.headers.set('Access-Control-Allow-Origin', '*');
    supabaseResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    supabaseResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  return supabaseResponse;
}

// ─── Matcher ─────────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    /**
     * Match all request paths EXCEPT:
     * - _next/static  (Next.js static assets)
     * - _next/image   (Next.js image optimisation)
     * - favicon.ico, manifest.json, service workers, offline page
     * - Public asset directories: /icons/, /images/
     * - Binary file extensions (fonts, images, CSS, JS)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|workbox-[^.]+\\.js|~offline|icons/|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot|otf|map)$).*)',
  ],
};
