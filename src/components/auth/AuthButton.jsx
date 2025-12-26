import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AuthModal from './AuthModal';
import UserMenu from './UserMenu';

export default function AuthButton() {
  const [showModal, setShowModal] = useState(false);
  const { user, loading, isConfigured } = useAuth();

  // Don't show anything while loading or if not configured
  if (loading) {
    return (
      <div className="w-8 h-8 bg-gray-700 rounded-full animate-pulse" />
    );
  }

  if (!isConfigured) {
    return null;
  }

  // Show user menu if logged in
  if (user) {
    return <UserMenu />;
  }

  // Show sign in button
  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
      >
        Sign In
      </button>
      <AuthModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
