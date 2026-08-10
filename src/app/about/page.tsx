import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-extrabold text-brand-ink mb-4">عن ترباوية</h1>
        <p className="text-brand-ink/70 leading-relaxed mb-4">
          ترباوية منصة مصرية لاكتشاف وطلب الأكل من أفضل المطاعم.
          هدفنا نوصلك لأماكن الأكل اللي تستاهل فعلًا، بمنيوهات حقيقية وأسعار واضحة وطلب سهل وسريع.
        </p>
      </main>
      <Footer />
    </>
  );
}
