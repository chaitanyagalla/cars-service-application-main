'use client';

import Link from 'next/link';
import { ArrowRight, CalendarDays, CarFront, CheckCircle2, MessageCircle } from 'lucide-react';
import { useId, useRef, useState } from 'react';

const steps = [
  {
    label: 'Choose your car',
    title: 'A car that fits your plans.',
    description:
      'A quick city trip or a weekend with the whole family? Browse the fleet, compare daily rates, and take a closer look at the cars you like.',
    action: 'Find your car',
    icon: CarFront,
  },
  {
    label: 'Share your plans',
    title: 'Tell us where life is taking you.',
    description:
      'Choose your dates and pickup area, then add anything we should know. Need delivery? Share your location and we’ll talk through the options.',
    action: 'Browse cars & choose dates',
    icon: CalendarDays,
  },
  {
    label: 'Let’s confirm',
    title: 'A real conversation. Clear details.',
    description:
      'Send your enquiry on WhatsApp. We’ll confirm availability, the documents you’ll need, and the rental terms and final charges before you decide.',
    action: 'Talk to our team',
    icon: MessageCircle,
  },
  {
    label: 'Enjoy the drive',
    title: 'Pick up the keys. Make it your day.',
    description:
      'Complete the agreed verification and car handover, then you’re ready to go. Enjoy the drive and bring the car back at the time and place we’ve arranged.',
    action: 'Plan your next drive',
    icon: CheckCircle2,
  },
];

export default function BookingJourney({ whatsappNumber }: { whatsappNumber: string }) {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const whatsappHref = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent('Hi, I’d like to plan a self-drive car rental in Hyderabad. Can you help with availability and the rental details?')}`;

  return (
    <section className="booking-journey" id="how-it-works" aria-labelledby={id + '-heading'}>
      <div className="container journey-layout">
        <div className="journey-intro">
          <span className="journey-eyebrow">From browsing to driving</span>
          <h2 className="display" id={id + '-heading'}>
            Your next drive.
            <span>Four simple steps.</span>
          </h2>
          <p>Pick your car, tell us your plans, and we’ll help with the rest.</p>
          <span className="journey-hint">Select a step to see what happens next.</span>
        </div>

        <div className="journey-process">
          <div className="journey-tabs" role="tablist" aria-label="How to book your car">
            {steps.map((step, index) => (
              <button
                key={step.label}
                type="button"
                className="journey-tab"
                role="tab"
                id={id + '-tab-' + index}
                aria-controls={id + '-panel-' + index}
                aria-selected={active === index}
                tabIndex={active === index ? 0 : -1}
                ref={(element) => {
                  tabs.current[index] = element;
                }}
                onClick={() => setActive(index)}
                onKeyDown={(event) => {
                  let next: number;
                  if (event.key === 'ArrowRight') next = (index + 1) % steps.length;
                  else if (event.key === 'ArrowLeft')
                    next = (index + steps.length - 1) % steps.length;
                  else if (event.key === 'Home') next = 0;
                  else if (event.key === 'End') next = steps.length - 1;
                  else return;
                  event.preventDefault();
                  setActive(next);
                  tabs.current[next]?.focus();
                }}
              >
                <span className="journey-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="journey-tab-label">{step.label}</span>
              </button>
            ))}
          </div>

          <div className="journey-panels">
            {steps.map((step, index) => (
              <div
                className="journey-panel"
                role="tabpanel"
                id={id + '-panel-' + index}
                aria-labelledby={id + '-tab-' + index}
                aria-hidden={active !== index}
                inert={active !== index}
                data-active={active === index}
                key={step.label}
                tabIndex={0}
              >
                <div className="journey-panel-top">
                  <step.icon size={26} strokeWidth={1.5} aria-hidden="true" />
                  <span>Step {String(index + 1).padStart(2, '0')} / 04</span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                <div className="journey-panel-actions">
                  {index === 2 ? (
                    <a
                      className="journey-action"
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {step.action} <ArrowRight size={18} aria-hidden="true" />
                    </a>
                  ) : (
                    <Link className="journey-action" href="/cars">
                      {step.action} <ArrowRight size={18} aria-hidden="true" />
                    </Link>
                  )}
                  {index < steps.length - 1 && (
                    <button
                      type="button"
                      className="journey-next"
                      onClick={() => {
                        setActive(index + 1);
                        tabs.current[index + 1]?.focus();
                      }}
                    >
                      Next step <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
