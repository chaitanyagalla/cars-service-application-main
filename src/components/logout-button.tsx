'use client';
import { useState } from 'react';

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function logout() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Unable to sign out');
      window.location.assign('/admin/login');
    } catch {
      setError('Unable to sign out. Please try again.');
      setBusy(false);
    }
  }
  return (
    <div>
      <button type="button" className="small-btn" onClick={logout} disabled={busy}>
        {busy ? 'Signing out...' : 'Sign out'}
      </button>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </div>
  );
}
