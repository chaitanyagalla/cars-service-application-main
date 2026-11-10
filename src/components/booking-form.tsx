'use client';
import { useState } from 'react';
import { Button, toast } from '@heroui/react';
import { SteeringLoader } from '@/components/steering-loader';
export function BookingForm({ carId }: { carId: string }) {
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) || '').trim();
    const pickup = get('pickupDate');
    const drop = get('returnDate');
    if ((pickup || drop) && (!pickup || !drop)) {
      toast.warning('Check your dates', {
        description: 'Enter both pickup and return date/time.',
        timeout: 8000,
      });
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
      toast.danger('Could not prepare your enquiry', {
        description: err instanceof Error ? err.message : 'Please try again.',
        timeout: 8000,
      });
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="booking-form">
      <div className="full">
        <h3 className="booking-form-title">Your trip details</h3>
        <p className="note">
          We&apos;ll save your enquiry and open WhatsApp with these details filled in. Nothing is
          sent until you tap send.
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
        <span className="form-label">Pickup date &amp; time (optional)</span>
        <input className="input" name="pickupDate" type="datetime-local" />
      </label>
      <label className="field">
        <span className="form-label">Return date &amp; time (optional)</span>
        <input className="input" name="returnDate" type="datetime-local" />
      </label>
      <label className="field full">
        <span className="form-label">Anything else we should know?</span>
        <textarea
          className="input"
          name="notes"
          rows={3}
          maxLength={500}
          placeholder="e.g. airport pickup, outstation trip to Vijayawada"
        />
      </label>
      <div className="full">
        <Button className="hero-ui-btn" type="submit" isPending={busy} fullWidth>
          {busy ? <SteeringLoader label="Preparing your enquiry…" /> : 'Continue to WhatsApp →'}
        </Button>
      </div>
    </form>
  );
}
