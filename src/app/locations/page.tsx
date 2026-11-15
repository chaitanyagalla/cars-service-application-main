import CustomerLayout from '@/components/customer-layout';
import { LocationCard } from '@/components/site-shell';
import { getLocations, getSettings } from '@/lib/store';
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
            <h1 className="display page-title">
              Self-Drive Delivery Across <span className="text-accent">Hyderabad</span>
            </h1>
            <p className="sub">
              These are our listed service areas. Confirm whether your specific address is covered.
            </p>
          </div>
          <div className="location-grid">
            {areas.map((a) => (
              <LocationCard key={a.id} name={a.name} subtitle={a.subtitle} />
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
