import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppFeedback } from '@/components/app-feedback';
export const viewport: Viewport = {
  themeColor: '#101b2d',
  colorScheme: 'dark',
};
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'Luxury Self Drive Cars | Hyderabad',
    template: '%s | Luxury Self Drive Cars',
  },
  description:
    'Explore self-drive cars in Hyderabad, compare daily rates, and enquire on WhatsApp.',
  openGraph: {
    type: 'website',
    title: 'Luxury Self Drive Cars',
    description: 'Self-drive car rentals in Hyderabad with easy WhatsApp enquiries.',
  },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <AppFeedback>{children}</AppFeedback>
      </body>
    </html>
  );
}
