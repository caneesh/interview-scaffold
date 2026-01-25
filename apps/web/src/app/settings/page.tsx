'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface UserProfile {
  email: string;
  display_name: string;
  avatar_url: string | null;
}

interface UserSettings {
  default_track: string;
  preferred_language: string;
  ai_coaching_enabled: boolean;
  hint_budget_daily: number;
  email_notifications_enabled: boolean;
}

type ToastType = 'success' | 'error' | null;

const TRACK_OPTIONS = [
  { value: 'coding_interview', label: 'Coding Interview' },
  { value: 'debug_lab', label: 'Debug Lab' },
  { value: 'system_design', label: 'System Design' },
];

const LANGUAGE_OPTIONS = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
];

/**
 * Settings Page
 *
 * Allows users to view and update their profile and application preferences.
 */
export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile>({
    email: '',
    display_name: '',
    avatar_url: null,
  });
  const [settings, setSettings] = useState<UserSettings>({
    default_track: 'coding_interview',
    preferred_language: 'javascript',
    ai_coaching_enabled: true,
    hint_budget_daily: 5,
    email_notifications_enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Track initial values for change detection
  const [initialProfile, setInitialProfile] = useState<UserProfile | null>(null);
  const [initialSettings, setInitialSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  // Check for changes whenever profile or settings change
  useEffect(() => {
    if (initialProfile && initialSettings) {
      const profileChanged =
        profile.display_name !== initialProfile.display_name;
      const settingsChanged =
        settings.default_track !== initialSettings.default_track ||
        settings.preferred_language !== initialSettings.preferred_language ||
        settings.ai_coaching_enabled !== initialSettings.ai_coaching_enabled ||
        settings.hint_budget_daily !== initialSettings.hint_budget_daily ||
        settings.email_notifications_enabled !== initialSettings.email_notifications_enabled;

      setHasChanges(profileChanged || settingsChanged);
    }
  }, [profile, settings, initialProfile, initialSettings]);

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) {
        throw new Error('Failed to fetch settings');
      }
      const data = await res.json();

      const fetchedProfile = data.profile || {
        email: '',
        display_name: '',
        avatar_url: null,
      };
      const fetchedSettings = data.settings || {
        default_track: 'coding_interview',
        preferred_language: 'javascript',
        ai_coaching_enabled: true,
        hint_budget_daily: 5,
        email_notifications_enabled: false,
      };

      setProfile(fetchedProfile);
      setSettings(fetchedSettings);
      setInitialProfile(fetchedProfile);
      setInitialSettings(fetchedSettings);
    } catch (err) {
      console.error('[settings] Error fetching settings:', err);
      showToast('error', 'Failed to load settings. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile: {
            display_name: profile.display_name,
          },
          settings: {
            default_track: settings.default_track,
            preferred_language: settings.preferred_language,
            ai_coaching_enabled: settings.ai_coaching_enabled,
            hint_budget_daily: settings.hint_budget_daily,
            email_notifications_enabled: settings.email_notifications_enabled,
          },
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to save settings');
      }

      // Update initial values to reflect saved state
      setInitialProfile({ ...profile });
      setInitialSettings({ ...settings });
      setHasChanges(false);

      showToast('success', 'Settings saved successfully');
    } catch (err) {
      console.error('[settings] Error saving settings:', err);
      showToast('error', err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  function showToast(type: ToastType, message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  if (loading) {
    return (
      <div className="settings-page">
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <header className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">
          Manage your profile and application preferences
        </p>
      </header>

      {/* Profile Section */}
      <section className="settings-section">
        <h2 className="settings-section-title">Profile</h2>
        <Card>
          <Card.Body>
            <div className="settings-field">
              <label className="settings-label" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="settings-input settings-input--readonly"
                value={profile.email}
                disabled
                readOnly
              />
              <p className="settings-description">
                Your email address is managed by your authentication provider.
              </p>
            </div>

            <div className="settings-field">
              <label className="settings-label" htmlFor="display_name">
                Display Name
              </label>
              <input
                id="display_name"
                type="text"
                className="settings-input"
                value={profile.display_name}
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, display_name: e.target.value }))
                }
                placeholder="Enter your display name"
                maxLength={100}
              />
              <p className="settings-description">
                This name will be shown in the app and on your profile.
              </p>
            </div>
          </Card.Body>
        </Card>
      </section>

      {/* Preferences Section */}
      <section className="settings-section">
        <h2 className="settings-section-title">Preferences</h2>
        <Card>
          <Card.Body>
            <div className="settings-field">
              <label className="settings-label" htmlFor="default_track">
                Default Track
              </label>
              <select
                id="default_track"
                className="settings-select"
                value={settings.default_track}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, default_track: e.target.value }))
                }
              >
                {TRACK_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="settings-description">
                Your preferred learning track for new practice sessions.
              </p>
            </div>

            <div className="settings-field">
              <label className="settings-label" htmlFor="preferred_language">
                Preferred Language
              </label>
              <select
                id="preferred_language"
                className="settings-select"
                value={settings.preferred_language}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, preferred_language: e.target.value }))
                }
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="settings-description">
                Your preferred programming language for code examples and solutions.
              </p>
            </div>

            <div className="settings-field">
              <label className="settings-label" htmlFor="hint_budget_daily">
                Daily Hint Budget
              </label>
              <input
                id="hint_budget_daily"
                type="number"
                className="settings-input"
                value={settings.hint_budget_daily}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    hint_budget_daily: Math.max(0, Math.min(20, parseInt(e.target.value) || 0)),
                  }))
                }
                min={0}
                max={20}
              />
              <p className="settings-description">
                Maximum number of hints you can use per day (0-20). Lower values encourage independent problem-solving.
              </p>
            </div>
          </Card.Body>
        </Card>
      </section>

      {/* Features Section */}
      <section className="settings-section">
        <h2 className="settings-section-title">Features</h2>
        <Card>
          <Card.Body>
            <div className="settings-toggle-row">
              <div className="settings-toggle-label">
                <span className="settings-toggle-title">AI Coaching</span>
                <span className="settings-toggle-description">
                  Enable AI-powered Socratic coaching during practice sessions
                </span>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.ai_coaching_enabled}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      ai_coaching_enabled: e.target.checked,
                    }))
                  }
                />
                <span className="settings-toggle-track" />
              </label>
            </div>

            <div className="settings-toggle-row">
              <div className="settings-toggle-label">
                <span className="settings-toggle-title">Email Notifications</span>
                <span className="settings-toggle-description">
                  Receive email updates about your progress and new features
                </span>
              </div>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.email_notifications_enabled}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      email_notifications_enabled: e.target.checked,
                    }))
                  }
                />
                <span className="settings-toggle-track" />
              </label>
            </div>
          </Card.Body>
        </Card>
      </section>

      {/* Save Button */}
      <div className="settings-actions">
        <Button
          variant="primary"
          onClick={handleSave}
          loading={saving}
          disabled={!hasChanges || saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`settings-toast settings-toast--${toast.type}`}>
          {toast.type === 'success' ? <CheckIcon /> : <ErrorIcon />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

// Icon Components
function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
