'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type FormState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Login Page - Magic Link Authentication
 *
 * Allows users to sign in via email magic link.
 * No password required - just enter email and click the link.
 */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim()) {
      setErrorMessage('Please enter your email address');
      setFormState('error');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage('Please enter a valid email address');
      setFormState('error');
      return;
    }

    setFormState('loading');
    setErrorMessage('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          // Redirect to callback after clicking the magic link
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error('[login] Magic link error:', error.message);
        setErrorMessage(error.message);
        setFormState('error');
        return;
      }

      setFormState('success');
    } catch (err) {
      console.error('[login] Unexpected error:', err);
      setErrorMessage('An unexpected error occurred. Please try again.');
      setFormState('error');
    }
  }

  // Success state - show "check your email" message
  if (formState === 'success') {
    return (
      <div className="auth-page">
        <Card className="auth-card">
          <Card.Body>
            <div className="auth-success">
              <div className="auth-success-icon">
                <MailIcon />
              </div>
              <h1 className="auth-title">Check your email</h1>
              <p className="auth-subtitle">
                We sent a magic link to <strong>{email}</strong>
              </p>
              <p className="auth-instructions">
                Click the link in the email to sign in. The link will expire in 1 hour.
              </p>
              <div className="auth-actions">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setFormState('idle');
                    setEmail('');
                  }}
                >
                  Use a different email
                </Button>
              </div>
            </div>
          </Card.Body>
        </Card>
      </div>
    );
  }

  // Login form
  return (
    <div className="auth-page">
      <Card className="auth-card">
        <Card.Body>
          <div className="auth-header">
            <LogoIcon />
            <h1 className="auth-title">Welcome to Scaffold</h1>
            <p className="auth-subtitle">
              Sign in to continue your interview preparation journey
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="email" className="auth-label">
                Email address
              </label>
              <input
                id="email"
                type="email"
                className="auth-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={formState === 'loading'}
                autoComplete="email"
                autoFocus
              />
            </div>

            {formState === 'error' && errorMessage && (
              <div className="auth-error" role="alert">
                <ErrorIcon />
                <span>{errorMessage}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={formState === 'loading'}
            >
              {formState === 'loading' ? 'Sending magic link...' : 'Send magic link'}
            </Button>
          </form>

          <p className="auth-footer">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </Card.Body>
      </Card>
    </div>
  );
}

// Icon Components
function LogoIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="auth-logo">
      <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22 6L12 13L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
      <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
