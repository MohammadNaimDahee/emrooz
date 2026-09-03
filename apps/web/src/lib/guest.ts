'use client';
import { useEffect, useState } from 'react';

const KEY = 'emrooz.guestId';

export function useGuestId(): string {
  const [id, setId] = useState<string>('');
  useEffect(() => {
    let stored = localStorage.getItem(KEY);
    if (!stored) {
      stored = 'guest_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(KEY, stored);
    }
    setId(stored);
  }, []);
  return id;
}
