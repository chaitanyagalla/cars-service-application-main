'use client';
import { useState } from 'react';
import { toast } from '@heroui/react';
import { useFeedback } from '@/components/app-feedback';

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const { requestLeave, cancelLeave } = useFeedback();
  async function logout() {
    if (busy) return;
    if (!(await requestLeave())) return;
    setBusy(true);
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Unable to sign out');
      window.location.assign('/admin/login');
    } catch {
      cancelLeave();
      toast.danger('Unable to sign out', { description: 'Please try again.', timeout: 8000 });
      setBusy(false);
    }
  }
  return (
    <div>
      <button type="button" className="small-btn" onClick={logout} disabled={busy}>
        {busy ? 'Signing out...' : 'Sign out'}
      </button>
    </div>
  );
}
