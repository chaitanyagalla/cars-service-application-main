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
      <section className="catalog-page" aria-labelledby="catalog-heading">
        <div className="container">
          <CarFilters cars={cars} />
        </div>
      </section>
    </CustomerLayout>
  );
}
