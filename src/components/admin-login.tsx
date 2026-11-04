'use client';
import { useState } from 'react';
import { Button } from '@heroui/react';
export function AdminLogin() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not sign in');
      window.location.assign('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="panel"
      style={{ maxWidth: 440, margin: '80px auto', padding: 34 }}
    >
      <h1 className="serif" style={{ fontSize: 38, marginBottom: 7 }}>
        Admin Sign In
      </h1>
      <p className="note" style={{ marginBottom: 25 }}>
        Use the email and password assigned by your administrator.
      </p>
      <label className="field">
        <span className="form-label">Email</span>
        <input
          className="input"
          name="email"
          type="email"
          required
          autoComplete="username"
          maxLength={255}
        />
      </label>
      <label className="field" style={{ margin: '17px 0' }}>
        <span className="form-label">Password</span>
        <input
          className="input"
          name="password"
          type="password"
          required
          maxLength={128}
          autoComplete="current-password"
        />
      </label>
      {error && (
        <p role="alert" style={{ color: '#ff8a8a' }}>
          {error}
        </p>
      )}
      <Button className="hero-ui-btn" type="submit" fullWidth isPending={busy}>
        {busy ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
}
