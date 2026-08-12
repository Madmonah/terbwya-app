'use client';

import { useEffect } from 'react';

// تسجيل الـ service worker على مستوى الأبليكيشن كله (مش بس صفحة /app)
// عشان إشعارات الـ push تشتغل من أي صفحة
export default function SwRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // فشل التسجيل مش مشكلة حرجة — الموقع يشتغل عادي بدونه
      });
    }
  }, []);

  return null;
}
