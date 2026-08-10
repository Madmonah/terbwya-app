import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function AppDownloadPage() {
  return (
    <>
      <Header />
      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-violet-900 via-violet-700 to-violet-500 text-white">
          <div className="pointer-events-none absolute -top-16 -left-10 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 w-64 h-64 rounded-full bg-black/10 blur-3xl" />
          <div className="relative max-w-2xl mx-auto px-4 py-16 md:py-24 text-center">
            <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-4 py-1.5 text-xs md:text-sm font-bold mb-5">
              📲 قريبًا
            </span>
            <h1 className="text-2xl md:text-4xl font-extrabold mb-3">حمّل أبليكيشن ترباوية</h1>
            <p className="text-white/85 text-base md:text-lg">
              الأبليكيشن جاري تجهيزه دلوقتي — هيبقى متاح قريبًا على الآيفون والأندرويد.
            </p>
          </div>
        </section>
        <div className="max-w-2xl mx-auto px-4 py-14 text-center">
          <p className="text-brand-ink/60 mb-6">
            هنعلن هنا وعلى صفحات التواصل أول ما الأبليكيشن يبقى متاح للتحميل.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-2 bg-gray-100 text-brand-ink/40 font-bold px-5 py-3 rounded-xl cursor-not-allowed">
              🍎 App Store — قريبًا
            </span>
            <span className="inline-flex items-center gap-2 bg-gray-100 text-brand-ink/40 font-bold px-5 py-3 rounded-xl cursor-not-allowed">
              ▶️ Google Play — قريبًا
            </span>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
