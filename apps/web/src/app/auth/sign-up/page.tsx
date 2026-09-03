import type { Metadata } from 'next';
import SignUpClient from './sign-up-client';

export const metadata: Metadata = { title: 'Create account', robots: { index: false } };

export default function SignUpPage() {
  return <SignUpClient />;
}
