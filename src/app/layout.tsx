import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import './globals.css';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-cairo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ترباوية — أحلى أكل في مصر',
  description: 'ترباوية: منصة اكتشاف وطلب من أفضل المطاعم في مصر. منيوهات حقيقية، طلب سهل، وأكل زي ما يتقال عليه بالظبط.',
  metadataBase: new URL('https://terbwya.com'),
  openGraph: {
    title: 'ترباوية — أحلى أكل في مصر',
    description: 'اكتشف أفضل المطاعم واطلب أكلك المفضل بسهولة.',
    locale: 'ar_EG',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="font-sans bg-gray-50 text-brand-ink antialiased">
        {children}
      </body>
    </html>
  );
}
