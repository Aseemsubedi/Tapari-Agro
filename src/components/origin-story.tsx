function MountainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <path
        d="M8 36 20 16l8 12 4-6 8 14H8Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M20 16 24 10l6 8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M8 24c8-2 12-8 14-16-8 2-14 8-14 16Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M10 22c4-4 8-6 12-8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M16 5 26 9v7c0 6-4.5 10-10 12-5.5-2-10-6-10-12V9l10-4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m12 16 3 3 5-6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="m16 5 2.8 7.2H26l-5.8 4.4 2.2 7.2L16 19.6 9.6 23.8l2.2-7.2L6 12.2h7.2L16 5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const qualities = [
  { label: "100% Fresh", Icon: LeafIcon },
  { label: "Hygienic", Icon: ShieldIcon },
  { label: "Best Quality", Icon: StarIcon },
];

const regions = [
  { name: "Parbat", place: "Jaljala", note: "Hill harvests from Jaljala farms" },
  {
    name: "Myagdi",
    place: "Highlands",
    note: "Clean staples from highland fields",
  },
  {
    name: "Mustang",
    place: "Upper hills",
    note: "Distinct produce from Mustang",
  },
];

/** Full origin story with graphics — for About page */
export function OriginStory() {
  return (
    <section className="mt-14">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-brass">
        From the hills
      </p>
      <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">
        Direct from kishan to home
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink/65">
        We choose products that are{" "}
        <span className="font-medium text-ink">100% fresh</span>,{" "}
        <span className="font-medium text-ink">hygienic</span>, and of the{" "}
        <span className="font-medium text-ink">best quality</span> — sourced from
        Parbat (Jaljala), Myagdi, and Mustang.
      </p>

      <ul className="mt-8 grid gap-3 sm:grid-cols-3">
        {qualities.map(({ label, Icon }) => (
          <li
            key={label}
            className="flex items-center gap-3 border border-pine/10 bg-mist/40 px-4 py-4"
          >
            <span className="flex h-10 w-10 items-center justify-center bg-brass/15 text-brass">
              <Icon className="h-5 w-5" />
            </span>
            <span className="font-display text-base font-semibold text-ink">
              {label}
            </span>
          </li>
        ))}
      </ul>

      <ul className="mt-6 grid gap-4 sm:grid-cols-3">
        {regions.map((region) => (
          <li
            key={region.name}
            className="border border-pine/10 bg-chalk px-5 py-7 text-center"
          >
            <MountainIcon className="mx-auto h-9 w-9 text-brass" />
            <p className="mt-3 font-display text-xl font-semibold text-ink">
              {region.name}
            </p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-leaf">
              {region.place}
            </p>
            <p className="mt-2 text-sm text-ink/55">{region.note}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
