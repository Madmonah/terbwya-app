'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isIos(): boolean {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  return /android/i.test(window.navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  );
}

export default function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    setPlatform(isIos() ? 'ios' : isAndroid() ? 'android' : 'other');
    setStandalone(isStandalone());

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // تجاهل أي خطأ في التسجيل — التطبيق يشتغل عادي من غير service worker
      });
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  if (standalone || installed) {
    return (
      <div className="bg-white border border-green-200 rounded-2xl p-6 text-center max-w-md mx-auto">
        <span className="text-3xl block mb-2">✅</span>
        <p className="font-bold text-brand-ink">الأبليكيشن متثبت عندك بالفعل</p>
        <p className="text-brand-ink/50 text-sm mt-1">تقدر تفتحه من الشاشة الرئيسية في أي وقت.</p>
      </div>
    );
  }

  // أندرويد / كروم: زرار تثبيت مباشر لو المتصفح دعم الـ prompt
  if (deferredPrompt) {
    return (
      <button
        onClick={handleInstallClick}
        className="inline-flex items-center gap-2 bg-white text-brand-red font-extrabold px-8 py-3.5 rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all"
      >
        📲 ثبّت الأبليكيشن الآن
      </button>
    );
  }

  // آيفون: التثبيت البرمجي مش متاح — نوضح خطوات "إضافة للشاشة الرئيسية"
  if (platform === 'ios') {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-6 max-w-md mx-auto text-right">
        <p className="font-bold text-brand-ink mb-3 text-center">📲 ثبّت ترباوية على الآيفون</p>
        <ol className="space-y-2 text-sm text-brand-ink/70">
          <li className="flex items-center gap-2 justify-end">
            <span>اضغط على زر المشاركة <span className="inline-block">⬆️</span> في شريط المتصفح</span>
            <span className="shrink-0 bg-violet-50 text-brand-red font-bold w-6 h-6 rounded-full flex items-center justify-center">١</span>
          </li>
          <li className="flex items-center gap-2 justify-end">
            <span>اختار &quot;إضافة إلى الشاشة الرئيسية&quot; (Add to Home Screen)</span>
            <span className="shrink-0 bg-violet-50 text-brand-red font-bold w-6 h-6 rounded-full flex items-center justify-center">٢</span>
          </li>
          <li className="flex items-center gap-2 justify-end">
            <span>اضغط &quot;إضافة&quot; — وهتلاقي أيقونة ترباوية على شاشتك</span>
            <span className="shrink-0 bg-violet-50 text-brand-red font-bold w-6 h-6 rounded-full flex items-center justify-center">٣</span>
          </li>
        </ol>
      </div>
    );
  }

  // أندرويد من غير prompt متاح دلوقتي (لسه بيحمل) أو متصفح تاني
  if (platform === 'android') {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-6 max-w-md mx-auto text-right">
        <p className="font-bold text-brand-ink mb-3 text-center">📲 ثبّت ترباوية على الأندرويد</p>
        <ol className="space-y-2 text-sm text-brand-ink/70">
          <li className="flex items-center gap-2 justify-end">
            <span>افتح قائمة المتصفح (⋮) في الأعلى</span>
            <span className="shrink-0 bg-violet-50 text-brand-red font-bold w-6 h-6 rounded-full flex items-center justify-center">١</span>
          </li>
          <li className="flex items-center gap-2 justify-end">
            <span>اختار &quot;تثبيت التطبيق&quot; أو &quot;إضافة إلى الشاشة الرئيسية&quot;</span>
            <span className="shrink-0 bg-violet-50 text-brand-red font-bold w-6 h-6 rounded-full flex items-center justify-center">٢</span>
          </li>
        </ol>
      </div>
    );
  }

  return (
    <p className="text-white/85 text-sm max-w-md mx-auto">
      افتح الرابط من متصفح موبايلك (كروم أو سفاري) عشان تقدر تثبّت الأبليكيشن على شاشتك الرئيسية.
    </p>
  );
}
