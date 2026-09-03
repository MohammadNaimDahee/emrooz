import type { Metadata } from 'next';
import PlannerClient from './planner-client';

export const metadata: Metadata = {
  title: 'Planner',
  robots: { index: false },
};

export default function PlannerPage() {
  return <PlannerClient />;
}
