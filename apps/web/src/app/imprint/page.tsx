export const metadata = { title: 'Imprint' };

/**
 * Imprint (Impressum) page. Required by §5 TMG for a German operator and by
 * equivalent transparency rules in several other EU jurisdictions. The
 * placeholder structure below matches the mandatory fields; the operator
 * must supply real values before public release.
 */
export default function Imprint() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-4xl text-emerald-700">Imprint</h1>
      <p className="text-ink-500 mt-4">
        PLACEHOLDER — the operator must supply real values before public release. The structure
        below covers the fields required by §5 TMG (Germany) and the equivalent transparency rules
        in several other EU jurisdictions.
      </p>

      <h2 className="font-display text-2xl text-ink-900 mt-8">Service provider</h2>
      <address className="not-italic text-ink-700 mt-2 space-y-1">
        <div>[Legal name of operator]</div>
        <div>[Street and number]</div>
        <div>[Postcode, City]</div>
        <div>[Country]</div>
      </address>

      <h2 className="font-display text-2xl text-ink-900 mt-8">Contact</h2>
      <ul className="text-ink-700 mt-2 space-y-1">
        <li>
          Email:{' '}
          <a href="mailto:hello@emroozapp.com" className="text-emerald-700 underline focus-ring">
            hello@emroozapp.com
          </a>
        </li>
        <li>Phone: [+country code number]</li>
      </ul>

      <h2 className="font-display text-2xl text-ink-900 mt-8">Registration</h2>
      <ul className="text-ink-700 mt-2 space-y-1">
        <li>Registered at: [Court and registry number]</li>
        <li>VAT ID (if applicable): [VAT ID]</li>
      </ul>

      <h2 className="font-display text-2xl text-ink-900 mt-8">Responsible for content</h2>
      <p className="text-ink-700 mt-2">
        [Name of person responsible for the site's editorial content per §55 RStV or equivalent
        local rule], at the address above.
      </p>

      <h2 className="font-display text-2xl text-ink-900 mt-8">EU dispute resolution</h2>
      <p className="text-ink-700 mt-2">
        The European Commission provides a platform for online dispute resolution at{' '}
        <a
          href="https://ec.europa.eu/consumers/odr"
          target="_blank"
          rel="noreferrer"
          className="text-emerald-700 underline focus-ring"
        >
          ec.europa.eu/consumers/odr
        </a>
        . We are not obliged and not willing to participate in dispute-resolution proceedings before
        a consumer arbitration board.
      </p>
    </article>
  );
}
