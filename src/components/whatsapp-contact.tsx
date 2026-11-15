'use client';

import { useId, useRef, type ReactNode } from 'react';
import { ArrowUpRight, CarFront, Handshake, X } from 'lucide-react';

const conversations = [
  {
    title: 'Connect as a customer',
    description: 'Explore cars, availability and rental prices.',
    message:
      "Hi! I'm planning a self-drive car rental. Could you help me with available cars, pricing and booking details?",
    icon: CarFront,
  },
  {
    title: 'Explore a collaboration',
    description: 'Discuss partnerships and working together.',
    message:
      "Hi! I'm interested in partnering with Luxury Self Drive Cars. I'd love to discuss collaboration opportunities and how we can work together.",
    icon: Handshake,
  },
];

export default function WhatsAppContact({
  phone,
  children,
}: {
  phone: string;
  children: ReactNode;
}) {
  const id = useId();
  const card = useRef<HTMLDivElement>(null);
  const digits = phone.replace(/\D/g, '');

  return (
    <>
      <button
        type="button"
        className="floating-wa"
        popoverTarget={id}
        aria-haspopup="dialog"
        aria-label="Contact us on WhatsApp"
        aria-describedby={`${id}-tooltip`}
      >
        {children}
        <span className="floating-wa-tooltip" id={`${id}-tooltip`} role="tooltip">
          Let&apos;s talk
        </span>
      </button>

      <div
        ref={card}
        id={id}
        className="floating-wa-card"
        popover="auto"
        role="dialog"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
      >
        <div className="floating-wa-card-header">
          <div>
            <span className="floating-wa-eyebrow">Let&apos;s connect</span>
            <h2 id={`${id}-title`}>How can we help?</h2>
          </div>
          <button
            type="button"
            className="floating-wa-close"
            popoverTarget={id}
            popoverTargetAction="hide"
            aria-label="Close contact options"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <p id={`${id}-description`}>Choose an option to chat with our team.</p>
        <div className="floating-wa-options">
          {conversations.map(({ title, description, message, icon: Icon }) => (
            <a
              key={title}
              className="floating-wa-option"
              href={`https://wa.me/${digits}?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => card.current?.hidePopover()}
            >
              <Icon className="floating-wa-option-icon" size={22} aria-hidden="true" />
              <span>
                <strong>{title}</strong>
                <small>{description}</small>
              </span>
              <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          ))}
        </div>
        <span className="floating-wa-card-note">Opens a chat on WhatsApp</span>
      </div>
    </>
  );
}
