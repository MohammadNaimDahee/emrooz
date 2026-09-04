'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { deleteRecipe, setEditorialState, type EditorialTransition } from './actions';

const TRANSITIONS: {
  from: readonly string[];
  to: EditorialTransition;
  label: string;
  tone: 'primary' | 'ghost' | 'danger';
}[] = [
  { from: ['draft', 'imported'], to: 'needs_review', label: 'Send for review', tone: 'ghost' },
  { from: ['needs_review'], to: 'reviewed', label: 'Mark reviewed', tone: 'ghost' },
  {
    from: ['reviewed', 'needs_review', 'draft'],
    to: 'published',
    label: 'Publish',
    tone: 'primary',
  },
  { from: ['published'], to: 'draft', label: 'Unpublish', tone: 'ghost' },
  { from: ['draft', 'needs_review', 'imported'], to: 'rejected', label: 'Reject', tone: 'danger' },
  {
    from: ['published', 'rejected', 'draft', 'reviewed', 'needs_review'],
    to: 'archived',
    label: 'Archive',
    tone: 'ghost',
  },
];

const TONE_CLASSES = {
  primary: 'bg-emerald-700 text-cream-50 hover:bg-emerald-600',
  ghost: 'border border-ink-200 text-ink-700 hover:border-emerald-700 hover:text-emerald-700',
  danger: 'border border-rose-400/40 text-rose-400 hover:bg-rose-400/10',
} as const;

/**
 * Editorial transition buttons that respect the state machine. Buttons only
 * render if the transition is valid from the current state — this is the
 * UI layer of the same rule enforced by the setEditorialState server action.
 */
export function TransitionBar({ recipeId, state }: { recipeId: string; state: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function transition(to: EditorialTransition) {
    startTransition(() => {
      void (async () => {
        await setEditorialState(recipeId, to);
        router.refresh();
      })();
    });
  }

  function destroy() {
    if (!confirm('Delete this recipe? This cannot be undone.')) return;
    startTransition(() => {
      void (async () => {
        await deleteRecipe(recipeId);
        // redirect() inside the action navigates away, no refresh needed.
      })();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {TRANSITIONS.filter((t) => t.from.includes(state)).map((t) => (
        <button
          key={t.to}
          type="button"
          disabled={pending}
          onClick={() => transition(t.to)}
          className={`rounded-pill px-4 py-2 text-sm font-medium focus-ring shadow-card transition ${TONE_CLASSES[t.tone]} disabled:opacity-50`}
        >
          {t.label}
        </button>
      ))}
      <button
        type="button"
        disabled={pending}
        onClick={destroy}
        className="rounded-pill px-4 py-2 text-sm text-ink-400 hover:text-rose-400 focus-ring disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
