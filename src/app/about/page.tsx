import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function AboutPage() {
  return (
    <>
      <Header />
      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-violet-900 via-violet-700 to-violet-500 text-white">
          <div className="pointer-events-none absolute -top-16 -left-10 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 w-64 h-64 rounded-full bg-black/10 blur-3xl" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-mark.svg"
            alt=""
            className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 w-40 h-40 opacity-10"
          />
          <div className="relative max-w-2xl mx-auto px-4 py-14 md:py-20 text-center">
            <h1 className="text-2xl md:text-3xl font-extrabold mb-2">عن ترباوية</h1>
            <p className="text-white/85">منصة الأكل المصرية اللي بتدلعك</p>
          </div>
        </section>
        <div className="max-w-2xl mx-auto px-4 py-12">
          <p className="text-brand-ink/70 leading-relaxed">
            ترباوية منصة مصرية لاكتشاف وطلب الأكل من أفضل المطاعم.
            هدفنا نوصلك لأماكن الأكل اللي تستاهل فعلًا، بمنيوهات حقيقية وأسعار واضحة وطلب سهل وسريع.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
