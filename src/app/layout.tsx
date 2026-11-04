import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'Universal Self Drive Cars | Hyderabad',
    template: '%s | Universal Self Drive Cars',
  },
  description:
    'Explore self-drive cars in Hyderabad, compare daily rates, and enquire on WhatsApp.',
  openGraph: {
    type: 'website',
    title: 'Universal Self Drive Cars',
    description: 'Self-drive car rentals in Hyderabad with easy WhatsApp enquiries.',
  },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
