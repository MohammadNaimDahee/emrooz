'use client';
import { useEffect, useState } from 'react';

import { useTranslator } from '../lib/i18n-client';

export function OfflineBanner() {
  const { t } = useTranslator();
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" className="bg-yellow-100 text-yellow-900 text-center text-sm py-2 px-4">
      {t('offline.banner')}
    </div>
  );
}
