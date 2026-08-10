import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function PharmaciesPage() {
  return (
    <>
      <Header />
      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-violet-800 via-violet-600 to-violet-400 text-white">
          <div className="pointer-events-none absolute -top-16 -left-10 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 w-64 h-64 rounded-full bg-black/10 blur-3xl" />
          <div className="relative max-w-2xl mx-auto px-4 py-16 md:py-24 text-center">
            <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-4 py-1.5 text-xs md:text-sm font-bold mb-5">
              💊 قريبًا
            </span>
            <h1 className="text-2xl md:text-4xl font-extrabold mb-3">الصيدليات</h1>
            <p className="text-white/85 text-base md:text-lg">
              قسم الصيدليات جاري نقله وتجهيزه دلوقتي — هيبقى متاح قريبًا.
            </p>
          </div>
        </section>
        <div className="max-w-2xl mx-auto px-4 py-14 text-center">
          <p className="text-brand-ink/60">
            هنعلن هنا وعلى صفحات التواصل أول ما الصيدليات تبقى متاحة للطلب من ترباوية.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
