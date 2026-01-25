/**
 * Settings API Route Handler
 *
 * GET: Fetch current user's profile and settings
 * PATCH: Update current user's profile and settings
 *
 * SECURITY:
 * - Uses Supabase server client with RLS (Row Level Security)
 * - Never accepts user_id from client - uses auth.uid() from session
 * - RLS policies ensure users can only access their own data
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, getCurrentUser, ensureProfileSettings, isSupabaseConfigured } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schema for PATCH request
const updateSettingsSchema = z.object({
  profile: z
    .object({
      display_name: z.string().min(1).max(100).optional(),
    })
    .optional(),
  settings: z
    .object({
      default_track: z.enum(['coding_interview', 'debug_lab', 'system_design']).optional(),
      preferred_language: z
        .enum(['javascript', 'typescript', 'python', 'java', 'cpp', 'go', 'rust'])
        .optional(),
      ai_coaching_enabled: z.boolean().optional(),
      hint_budget_daily: z.number().int().min(0).max(20).optional(),
      email_notifications_enabled: z.boolean().optional(),
    })
    .optional(),
});

export const dynamic = 'force-dynamic';

/**
 * GET /api/settings
 *
 * Returns the current user's profile and settings.
 * Creates profile/settings if they don't exist (first-time user).
 */
export async function GET() {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: { code: 'NOT_CONFIGURED', message: 'Supabase is not configured' } },
        { status: 503 }
      );
    }

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Ensure profile and settings exist
    await ensureProfileSettings();

    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json(
        { error: { code: 'NOT_CONFIGURED', message: 'Supabase is not configured' } },
        { status: 503 }
      );
    }

    // Fetch profile (RLS enforces ownership)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, display_name, avatar_url')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('[settings] Error fetching profile:', profileError.message);
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to fetch profile' } },
        { status: 500 }
      );
    }

    // Fetch settings (RLS enforces ownership)
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('default_track, preferred_language, ai_coaching_enabled, hint_budget_daily, email_notifications_enabled')
      .eq('user_id', user.id)
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('[settings] Error fetching settings:', settingsError.message);
      return NextResponse.json(
        { error: { code: 'DATABASE_ERROR', message: 'Failed to fetch settings' } },
        { status: 500 }
      );
    }

    // Return profile and settings (with defaults if not found)
    return NextResponse.json({
      profile: profile || {
        email: user.email,
        display_name: user.email?.split('@')[0] || 'User',
        avatar_url: null,
      },
      settings: settings || {
        default_track: 'coding_interview',
        preferred_language: 'javascript',
        ai_coaching_enabled: true,
        hint_budget_daily: 5,
        email_notifications_enabled: false,
      },
    });
  } catch (error) {
    console.error('[settings] Unexpected error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/settings
 *
 * Updates the current user's profile and/or settings.
 * Only updates fields that are provided in the request body.
 */
export async function PATCH(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: { code: 'NOT_CONFIGURED', message: 'Supabase is not configured' } },
        { status: 503 }
      );
    }

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'INVALID_JSON', message: 'Invalid JSON in request body' } },
        { status: 400 }
      );
    }

    const validation = updateSettingsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validation.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { profile: profileUpdates, settings: settingsUpdates } = validation.data;

    // Ensure profile and settings exist before updating
    await ensureProfileSettings();

    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json(
        { error: { code: 'NOT_CONFIGURED', message: 'Supabase is not configured' } },
        { status: 503 }
      );
    }

    // Update profile if provided (RLS enforces ownership)
    if (profileUpdates && Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          ...profileUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('[settings] Error updating profile:', profileError.message);
        return NextResponse.json(
          { error: { code: 'DATABASE_ERROR', message: 'Failed to update profile' } },
          { status: 500 }
        );
      }
    }

    // Update settings if provided (RLS enforces ownership)
    if (settingsUpdates && Object.keys(settingsUpdates).length > 0) {
      const { error: settingsError } = await supabase
        .from('user_settings')
        .update({
          ...settingsUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (settingsError) {
        console.error('[settings] Error updating settings:', settingsError.message);
        return NextResponse.json(
          { error: { code: 'DATABASE_ERROR', message: 'Failed to update settings' } },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[settings] Unexpected error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
