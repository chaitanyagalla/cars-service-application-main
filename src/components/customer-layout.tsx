import { Header, Footer, FloatingWhatsApp } from './site-shell';
import { getSettings, getCars, getLocations } from '@/lib/store';
export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const [settings, cars, locations] = await Promise.all([getSettings(), getCars(), getLocations()]);
  return (
    <>
      <Header settings={settings} />
      <main>{children}</main>
      <Footer settings={settings} cars={cars} locations={locations} />
      <FloatingWhatsApp phone={settings.whatsappNumber} />
    </>
  );
}
