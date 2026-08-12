import Header from '@/components/Header';
import Footer from '@/components/Footer';
import OrderLookup from './OrderLookup';

export const dynamic = 'force-dynamic';

export default function OrderTrackingPage({ params }: { params: { reference: string } }) {
  return (
    <>
      <Header />
      <main className="max-w-lg mx-auto px-4 py-10">
        <OrderLookup reference={params.reference} />
      </main>
      <Footer />
    </>
  );
}
