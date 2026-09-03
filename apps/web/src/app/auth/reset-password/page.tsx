import type { Metadata } from 'next';
import ResetPasswordClient from './reset-client';

export const metadata: Metadata = { title: 'Reset password', robots: { index: false } };

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
