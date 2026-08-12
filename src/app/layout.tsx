import type { Metadata, Viewport } from 'next';
import { Cairo } from 'next/font/google';
import './globals.css';
import SwRegister from '@/components/SwRegister';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-cairo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ترباوية — أقوى الخصومات والعروض',
  description: 'ترباوية: منصة اكتشاف وطلب من أفضل المطاعم في مصر. منيوهات حقيقية، طلب سهل، وأكل زي ما يتقال عليه بالظبط.',
  metadataBase: new URL('https://terbwya.com'),
  manifest: '/manifest.json',
  openGraph: {
    title: 'ترباوية — أقوى الخصومات والعروض',
    description: 'اكتشف أفضل المطاعم واطلب أكلك المفضل بسهولة.',
    locale: 'ar_EG',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#5C2C93',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="font-sans bg-gray-50 text-brand-ink antialiased">
        <SwRegister />
        {children}
      </body>
    </html>
  );
}
