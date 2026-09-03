import type { Metadata } from 'next';
import ForgotPasswordClient from './forgot-client';

export const metadata: Metadata = { title: 'Forgot password', robots: { index: false } };

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
