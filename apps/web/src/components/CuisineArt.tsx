import { hashString } from '@emrooz/core';

// A palette of two-stop warm gradients that feel food-adjacent without leaning
// on stereotypes. Deterministic per cuisine so the same recipe looks the same
// across renders.
const PALETTES: Array<[string, string, string]> = [
  ['#EDC08B', '#D97F2F', '#7A3D14'],
  ['#B9D9BE', '#3E7A4C', '#123020'],
  ['#F4C8B4', '#C97466', '#5F1F1B'],
  ['#F1E1B0', '#B99138', '#5A4114'],
  ['#B7D3CB', '#3F7A72', '#154645'],
  ['#DDB4D5', '#7C4082', '#3B143F'],
  ['#F1B0A5', '#B6483A', '#5F1B14'],
  ['#C3D6A8', '#5F7A3E', '#243318'],
  ['#F1DAA0', '#C88A2E', '#5B3812'],
  ['#B3C8E0', '#3F5F87', '#152A44'],
];

export function paletteFor(key: string): [string, string, string] {
  const i = hashString(key) % PALETTES.length;
  // Non-null assertion is safe: PALETTES is non-empty and i is in [0, length).
  return PALETTES[i]!;
}

/**
 * Decorative gradient thumbnail that always fills the recipe card space
 * even when no image is licensed for storage. The pattern is deterministic
 * for a given `seed` so cards stay recognizable.
 */
export function CuisineArt({
  seed,
  label,
  className,
  size = 'md',
}: {
  seed: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
}) {
  const [c1, c2, c3] = paletteFor(seed);
  const heights: Record<typeof size, string> = {
    sm: 'h-24',
    md: 'h-36',
    lg: 'h-48',
    hero: 'h-72 md:h-96',
  };
  const seedNum = hashString(seed);
  const angle = 20 + (seedNum % 60);
  const dotSeed = seedNum % 4;

  return (
    <div
      role="img"
      aria-label={label ?? 'Recipe artwork'}
      className={`relative overflow-hidden ${heights[size]} ${className ?? ''}`}
      style={{
        background: `linear-gradient(${angle}deg, ${c1} 0%, ${c2} 55%, ${c3} 130%)`,
      }}
    >
      <svg
        viewBox="0 0 400 240"
        className="absolute inset-0 w-full h-full mix-blend-soft-light opacity-70"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`g-${seedNum}`} cx="30%" cy="30%">
            <stop offset="0" stopColor="white" stopOpacity="0.6" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="90" cy="60" r="140" fill={`url(#g-${seedNum})`} />
        {dotSeed === 0 && <circle cx="320" cy="180" r="70" fill="white" opacity="0.10" />}
        {dotSeed === 1 && (
          <path d="M0,180 Q200,80 400,180 L400,240 L0,240 Z" fill="white" opacity="0.10" />
        )}
        {dotSeed === 2 && (
          <g fill="white" opacity="0.12">
            <circle cx="260" cy="80" r="30" />
            <circle cx="310" cy="140" r="20" />
            <circle cx="220" cy="160" r="16" />
          </g>
        )}
        {dotSeed === 3 && (
          <g stroke="white" strokeOpacity="0.14" fill="none" strokeWidth="1.5">
            <path d="M0,120 Q100,80 200,120 T400,120" />
            <path d="M0,150 Q100,110 200,150 T400,150" />
          </g>
        )}
      </svg>
      {label && (
        <span className="absolute bottom-3 left-3 rounded-full bg-black/25 text-white text-xs px-2 py-1 backdrop-blur-sm">
          {label}
        </span>
      )}
    </div>
  );
}
