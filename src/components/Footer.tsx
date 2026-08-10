export default function Footer() {
  return (
    <footer className="bg-brand-ink text-white/80 mt-16">
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="relative w-16 h-16 rounded-full bg-white/95 p-0.5 overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/logo-icon.png"
                alt="ترباوية"
                className="w-full h-full rounded-full object-cover scale-[1.9]"
              />
            </span>
            <span className="text-xl font-extrabold text-white">ترباوية</span>
          </div>
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
