import type { Metadata } from 'next';
import { Suspense } from 'react';
import SignInClient from './sign-in-client';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 pt-10">Loading…</div>}>
      <SignInClient />
    </Suspense>
  );
}
