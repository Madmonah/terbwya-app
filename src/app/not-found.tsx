import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-cream text-brand-ink px-4 text-center">
      <div className="text-5xl mb-4">🍽️</div>
      <h1 className="text-2xl font-extrabold mb-2">الصفحة مش موجودة</h1>
      <p className="text-brand-ink/60 mb-6">يمكن اللينك غلط أو الصفحة اتشالت.</p>
      <Link href="/" className="bg-brand-red text-white font-bold px-6 py-3 rounded-xl no-underline">
        ارجع للرئيسية
      </Link>
    </div>
  );
}
