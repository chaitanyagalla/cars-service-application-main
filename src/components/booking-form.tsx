'use client';
import { useState } from 'react';
import { Button } from '@heroui/react';
export function BookingForm({ carId }: { carId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) || '').trim();
    const pickup = get('pickupDate');
    const drop = get('returnDate');
    if ((pickup || drop) && (!pickup || !drop)) {
      setError('Enter both pickup and return date/time.');
      setBusy(false);
      return;
    }
    const payload = {
      carId,
      customerName: get('customerName'),
      customerPhone: get('customerPhone'),
      pickupLocation: get('pickupLocation'),
      pickupDate: pickup ? new Date(pickup).toISOString() : null,
      returnDate: drop ? new Date(drop).toISOString() : null,
      notes: get('notes'),
    };
    try {
      const response = await fetch('/api/booking-intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not prepare booking');
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please try again.');
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="booking-form">
      <div className="full">
        <h3 style={{ fontSize: 23, fontWeight: 750 }}>Send an enquiry on WhatsApp</h3>
        <p className="note">
          Save the enquiry for our team, then open a prefilled WhatsApp message. Sending the message
          is your final step.
        </p>
      </div>
      <label className="field">
        <span className="form-label">Your name *</span>
        <input
          className="input"
          required
          minLength={2}
          name="customerName"
          maxLength={100}
          autoComplete="name"
        />
      </label>
      <label className="field">
        <span className="form-label">Phone number *</span>
        <input
          className="input"
          required
          name="customerPhone"
          maxLength={20}
          type="tel"
          pattern="[+0-9 ()-]{10,20}"
        />
      </label>
      <label className="field full">
        <span className="form-label">Pickup area *</span>
        <input
          className="input"
          name="pickupLocation"
          required
          maxLength={120}
          placeholder="Gachibowli, Hyderabad"
        />
      </label>
      <label className="field">
        <span className="form-label">Pickup date/time (optional)</span>
        <input className="input" name="pickupDate" type="datetime-local" />
      </label>
      <label className="field">
        <span className="form-label">Return date/time (optional)</span>
        <input className="input" name="returnDate" type="datetime-local" />
      </label>
      <label className="field full">
        <span className="form-label">Notes</span>
        <textarea className="input" name="notes" rows={3} maxLength={500} />
      </label>
      <div className="full">
        {error && (
          <p role="alert" style={{ color: '#ff8c84' }}>
            {error}
          </p>
        )}
        <Button className="hero-ui-btn" type="submit" isPending={busy} fullWidth>
          {busy ? 'Preparing enquiry...' : 'Save enquiry & open WhatsApp →'}
        </Button>
      </div>
    </form>
  );
}
