import CustomerLayout from '@/components/customer-layout';
import { getLocations, getSettings } from '@/lib/store';
import { MapPin } from 'lucide-react';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pickup & Delivery Areas' };
export default async function LocationsPage() {
  const [areas, settings] = await Promise.all([getLocations(), getSettings()]);
  return (
    <CustomerLayout>
      <section className="section">
        <div className="container">
          <div className="center">
            <span className="eyebrow">Delivery Locations</span>
            <h1 className="serif" style={{ fontSize: 55 }}>
              Self-Drive Delivery Across Hyderabad
            </h1>
            <p className="sub">
              These are our listed service areas. Confirm whether your specific address is covered.
            </p>
          </div>
          <div className="location-grid">
            {areas.map((a) => (
              <div className="panel location-card" key={a.id}>
                <MapPin size={28} />
                <strong>{a.name}</strong>
                <span>{a.subtitle}</span>
              </div>
            ))}
          </div>
          <div className="center" style={{ marginTop: 35 }}>
            <a
              className="btn btn-gold"
              href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent('Hi! Is pickup/delivery available in my area in Hyderabad?')}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ask About My Area →
            </a>
          </div>
        </div>
      </section>
    </CustomerLayout>
  );
}
