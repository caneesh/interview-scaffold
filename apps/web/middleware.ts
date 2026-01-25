/**
 * Middleware for Route Protection
 *
 * Protects authenticated routes and handles session refresh.
 *
 * Protected routes: /practice, /debug, /coach, /skills, /settings, /explorer, /features, /daily, /interview, /bug-hunt
 * Public routes: /, /auth/*
 * Static assets and Next internals are always allowed.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Environment variables - may not be set during build
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/practice',
  '/debug',
  '/coach',
  '/skills',
  '/settings',
  '/explorer',
  '/features',
  '/daily',
  '/interview',
  '/bug-hunt',
];

/**
 * Check if a path matches any protected route prefix.
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Check if request is for static assets or Next.js internals.
 */
function isStaticOrInternal(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js')
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets and Next.js internals
  if (isStaticOrInternal(pathname)) {
    return NextResponse.next();
  }

  // If Supabase is not configured, allow all requests through
  // This enables the app to work without auth during development
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  // Create response to pass through
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create Supabase client with cookie handling
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          // Update cookies in request
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          // Create new response with updated cookies
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          // Set cookies in response
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh the session (important for keeping session alive)
  const { data: { user } } = await supabase.auth.getUser();

  // Check if route requires authentication
  if (isProtectedRoute(pathname)) {
    if (!user) {
      // Not authenticated, redirect to login
      const loginUrl = new URL('/auth/login', request.url);
      // Store the attempted URL to redirect back after login (optional)
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // If authenticated user tries to access login page, redirect to home
  if (pathname.startsWith('/auth/login') && user) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
