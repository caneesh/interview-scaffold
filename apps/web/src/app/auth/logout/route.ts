/**
 * Auth Logout Route Handler
 *
 * Signs out the user and clears the session cookies.
 * Redirects to the login page after logout.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('[auth/logout] Error signing out:', error.message);
  }

  // Always redirect to login, even if there was an error
  return NextResponse.redirect(`${origin}/auth/login`);
}

// Also support POST for form-based logout
export async function POST(request: NextRequest) {
  return GET(request);
}
