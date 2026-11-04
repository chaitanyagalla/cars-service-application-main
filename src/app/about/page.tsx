import CustomerLayout from '@/components/customer-layout';
import { getSettings } from '@/lib/store';
import { CarFront, MessageCircle, ShieldCheck } from 'lucide-react';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'About Us' };
export default async function AboutPage() {
  const settings = await getSettings();
  return (
    <CustomerLayout>
      <section className="section">
        <div className="container">
          <div className="center">
            <span className="eyebrow">About Our Service</span>
            <h1 className="serif" style={{ fontSize: 55 }}>
              Freedom to Explore, Your Way
            </h1>
            <p className="sub">{settings.description}</p>
          </div>
          <div className="feature-grid">
            {[
              {
                i: CarFront,
                t: 'Choose a vehicle',
                d: 'Browse car categories, published prices and key specifications.',
              },
              {
                i: MessageCircle,
                t: 'Connect directly',
                d: 'Start a prefilled WhatsApp chat with your chosen vehicle details.',
              },
              {
                i: ShieldCheck,
                t: 'Confirm the terms',
                d: 'Our team confirms availability, pickup, deposit, documents and final charges.',
              },
            ].map((x) => (
              <div className="panel feature" key={x.t}>
                <div className="feature-icon">
                  <x.i size={30} />
                </div>
                <h3>{x.t}</h3>
                <p>{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </CustomerLayout>
  );
}
