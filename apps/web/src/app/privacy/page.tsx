export const metadata = { title: 'Privacy' };

export default function Privacy() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl text-emerald-700">Privacy notice</h1>
      <p className="text-ink-500 mt-4">
        PLACEHOLDER — replace before public release with the operator's legally reviewed privacy
        notice. Include: data controller identity, purposes and legal bases (GDPR Art. 6),
        retention, third-country transfers, user rights, contact information for privacy queries,
        and, if applicable, DPO details.
      </p>
      <p className="text-ink-700 mt-4">
        Emrooz collects the minimum data required to provide recommendations. Allergy and dietary
        information is treated as sensitive and never used for advertising or third-party sharing.
      </p>

      <h2 className="font-display text-2xl text-ink-900 mt-8">Your rights</h2>
      <ul className="mt-3 list-disc pl-6 text-ink-700 space-y-2">
        <li>
          <strong>Access.</strong> Download a JSON export of everything Emrooz has stored about you
          from Settings → "Export my data". The file contains your profile, preferences, pantry,
          favorites, cooking history, feedback, planner entries, and shopping list.
        </li>
        <li>
          <strong>Erasure.</strong> Delete your account from Settings → "Delete my data". Every row
          in every user-scoped table is removed immediately, along with your authentication record.
          See below for what this means for backups.
        </li>
        <li>
          <strong>Rectification.</strong> All preferences, including dietary and allergy
          information, are editable at any time from Settings.
        </li>
        <li>
          <strong>Portability.</strong> The export format is stable and self-describing so you can
          import it into any Emrooz instance you self-host.
        </li>
      </ul>

      <h2 className="font-display text-2xl text-ink-900 mt-8">Backups and deletion</h2>
      <p className="text-ink-700 mt-3">
        Encrypted backups protect your data against accidental loss. When you delete your account,
        the live database is purged immediately, but existing backups taken before that moment
        continue to contain your data until they age out.
      </p>
      <p className="text-ink-700 mt-3">
        Rotation windows are documented in{' '}
        <code className="bg-ink-50 px-1 rounded">docs/backup-and-restore.md</code> — practically, a
        deletion request is fully honored across all backups within <strong>13 months</strong>. If
        you require earlier purging (for example under GDPR Art. 17 with immediate effect), contact
        us through the details in the imprint.
      </p>

      <h2 className="font-display text-2xl text-ink-900 mt-8">No analytics or ad tracking</h2>
      <p className="text-ink-700 mt-3">
        Emrooz V1 does not include analytics, advertising trackers, or nonessential cookies. No
        third party sees your recipe or dietary data.
      </p>
    </article>
  );
}
