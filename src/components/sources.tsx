import { useId } from 'react';
import { SOURCES, type SourceId } from '~/constants/sources';

const MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');

// '2026-11-13' → '13 Nov 2026', without time zones shifting the day
const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

/** A page's citations, small at the bottom: what each backs, then the reference */
export default function Sources({ ids }: { ids: SourceId[] }) {
  const headingId = useId();
  const unique = [...new Set(ids)];
  if (!unique.length) return null;

  return (
    <section
      aria-labelledby={headingId}
      className="col-span-full mt-6 border-t border-white/20 pt-3 text-xs text-white/70"
    >
      <h3 id={headingId} className="font-semibold text-white/80">
        Sources
      </h3>
      <ol className="mt-1 flex list-decimal flex-col gap-1 pl-5">
        {unique.map((id) => {
          const s = SOURCES[id];
          return (
            <li key={id}>
              <span className="text-white/80">{s.topic}:</span> {s.author} (
              {s.year}). <cite>{s.title}</cite>. {s.publisher}.{' '}
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="break-all underline hover:text-white focus-visible:outline-2 focus-visible:outline-white"
              >
                {s.url.replace(/^https:\/\/(www\.)?/, '')}
              </a>
              {s.accessed && `, accessed ${formatDate(s.accessed)}`}.
            </li>
          );
        })}
      </ol>
    </section>
  );
}
