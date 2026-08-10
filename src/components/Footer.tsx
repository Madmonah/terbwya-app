export default function Footer() {
  return (
    <footer className="bg-brand-ink text-white/80 mt-16">
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        <div>
          <div className="text-xl font-extrabold text-white mb-2">ترباوية 🍽️</div>
          <p>منصة اكتشاف وطلب من أفضل المطاعم في مصر.</p>
        </div>
        <div>
          <div className="font-bold text-white mb-2">روابط سريعة</div>
          <ul className="space-y-1">
            <li><a href="/restaurants" className="hover:text-white">تصفح المطاعم</a></li>
            <li><a href="/join" className="hover:text-white">سجّل مطعمك</a></li>
            <li><a href="/about" className="hover:text-white">عن المنصة</a></li>
          </ul>
        </div>
        <div>
          <div className="font-bold text-white mb-2">تواصل معنا</div>
          <p>واتساب الدعم قريبًا</p>
        </div>
      </div>
      <div className="text-center text-xs py-4 border-t border-white/10">
        © {new Date().getFullYear()} ترباوية. جميع الحقوق محفوظة.
      </div>
    </footer>
  );
}
