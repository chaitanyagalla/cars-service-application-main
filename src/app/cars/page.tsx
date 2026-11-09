import type { Metadata } from 'next';
import CustomerLayout from '@/components/customer-layout';
import CarFilters from '@/components/car-filters';
import { getCars } from '@/lib/store';
export const metadata: Metadata = {
  title: 'Browse Self Drive Cars',
  description: 'Compare self-drive car models and daily rental rates in Hyderabad.',
};
export const dynamic = 'force-dynamic';
export default async function CarsPage() {
  const cars = await getCars();
  return (
    <CustomerLayout>
      <section className="section">
        <div className="container">
          <div className="center">
            <span className="eyebrow">Our Fleet</span>
            <h1 className="display" style={{ fontSize: 'clamp(38px,5vw,62px)', marginBottom: 15 }}>
              Choose Your Perfect Ride
            </h1>
            <p className="sub">
              Browse our range of cars and send a car-specific booking enquiry on WhatsApp.
            </p>
          </div>
          <CarFilters cars={cars} />
        </div>
      </section>
    </CustomerLayout>
  );
}
