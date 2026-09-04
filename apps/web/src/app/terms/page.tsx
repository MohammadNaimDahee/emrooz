export const metadata = { title: 'Terms of service' };

export default function Terms() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl text-emerald-700">Terms of service</h1>
      <p className="text-ink-500 mt-4">
        PLACEHOLDER — the operator must supply their own reviewed terms of service before public
        release. The structure below is a starting point that reflects the actual surface of the
        Emrooz product; a lawyer should refine the wording per your jurisdiction and any commercial
        features you add later.
      </p>

      <h2 className="font-display text-2xl text-ink-900 mt-8">1. Who we are</h2>
      <p className="text-ink-700 mt-2">
        Emrooz is operated by <em>[Operator legal name]</em>, whose registered details are listed in
        the{' '}
        <a href="/imprint" className="text-emerald-700 underline focus-ring">
          Imprint
        </a>
        . These Terms govern your use of the Emrooz mobile app and web application (together, the
        "Service").
      </p>

      <h2 className="font-display text-2xl text-ink-900 mt-8">2. Accounts</h2>
      <p className="text-ink-700 mt-2">
        You can use the Service as a guest without an account. You may create an account with your
        email address to sync your data across devices. You are responsible for keeping your
        credentials secure and for the activity under your account. You can delete your account at
        any time from the Settings screen.
      </p>

      <h2 className="font-display text-2xl text-ink-900 mt-8">3. Content and licensing</h2>
      <p className="text-ink-700 mt-2">Recipes shown in Emrooz come from three kinds of sources:</p>
      <ul className="list-disc pl-6 text-ink-700 mt-2 space-y-1">
        <li>Content Emrooz owns outright.</li>
        <li>Content licensed from external providers under their own terms.</li>
        <li>Content contributed by community reviewers under an explicit permission.</li>
      </ul>
      <p className="text-ink-700 mt-2">
        Each recipe carries provenance and attribution metadata. You may cook from Emrooz recipes
        freely for personal use. You may not copy Emrooz-owned content wholesale into another
        product or service without written permission.
      </p>

      <h2 className="font-display text-2xl text-ink-900 mt-8">4. Third-party providers</h2>
      <p className="text-ink-700 mt-2">
        Emrooz uses external recipe providers (currently TheMealDB) whose own terms apply to content
        they supply. You can inspect the terms review record for each provider via the admin
        interface. If a provider revokes permission for previously imported content, Emrooz will
        archive or remove the affected recipes.
      </p>

      <h2 className="font-display text-2xl text-ink-900 mt-8">5. No medical advice</h2>
      <p className="text-ink-700 mt-2">
        Dietary and allergy filters are provided as informational support, not medical advice.
        Ingredient safety data comes from a curated catalogue that we work hard to keep accurate,
        but you remain responsible for your own dietary decisions. If you have a serious allergy,
        verify every ingredient before cooking.
      </p>

      <h2 className="font-display text-2xl text-ink-900 mt-8">6. Availability</h2>
      <p className="text-ink-700 mt-2">
        We aim for high uptime but do not warrant that the Service will be available at all times,
        uninterrupted, or free of defects. When we are aware of downtime, we will disclose it via{' '}
        <em>[operator status page URL]</em>.
      </p>

      <h2 className="font-display text-2xl text-ink-900 mt-8">7. Termination</h2>
      <p className="text-ink-700 mt-2">
        You may stop using the Service and delete your account at any time. We may terminate
        accounts that violate these Terms with reasonable notice, except where that notice would
        defeat the purpose of the termination.
      </p>

      <h2 className="font-display text-2xl text-ink-900 mt-8">8. Changes</h2>
      <p className="text-ink-700 mt-2">
        We may update these Terms; material changes will be announced in-app. The current version is
        dated in the metadata of this page.
      </p>

      <h2 className="font-display text-2xl text-ink-900 mt-8">9. Contact</h2>
      <p className="text-ink-700 mt-2">
        For questions about these Terms, contact us through the details in the{' '}
        <a href="/imprint" className="text-emerald-700 underline focus-ring">
          Imprint
        </a>
        .
      </p>
    </article>
  );
}
