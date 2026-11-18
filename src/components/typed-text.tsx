import { useEffect, useState } from 'react';
import {
  FADE_MS,
  briefingAt,
  briefingMs,
  typedAt,
  typingMs,
} from '~/utils/typewriter';
import { useMedia } from '~/utils/use-media';

const TICK_MS = 30; // the typing clock's step

/** ms since mounting, up to until; straight to the end with reduced motion */
function useElapsed(until: number) {
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)');
  const [ms, setMs] = useState(0);
  useEffect(() => {
    if (reducedMotion) return;
    let elapsed = 0;
    const id = setInterval(() => {
      elapsed += TICK_MS;
      setMs(elapsed);
      if (elapsed >= until) clearInterval(id);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [reducedMotion, until]);
  return reducedMotion ? Infinity : ms;
}

/**
 * The whole text for screen readers, and what's typed of it drawn from an
 * attribute, so it's never in the page twice. The rest is drawn invisible,
 * holding its space so nothing moves as it types.
 */
function Typed({ text, typed }: { text: string; typed: string }) {
  return (
    <>
      <span className="sr-only">{text}</span>
      <span
        aria-hidden="true"
        data-typed={typed}
        data-rest={text.slice(typed.length)}
        className="before:content-[attr(data-typed)] after:invisible after:content-[attr(data-rest)]"
      />
    </>
  );
}

function SaidNow({ text }: { text: string }) {
  const ms = useElapsed(typingMs(text));
  return <Typed text={text} typed={typedAt(text, ms)} />;
}

/** A line of Mr. G's, typed out as he says it */
export function Said({ children }: { children: string }) {
  // a new line starts typing afresh
  return <SaidNow key={children} text={children} />;
}

function BriefingNow({ lines }: { lines: string[] }) {
  const now = briefingAt(lines, useElapsed(briefingMs(lines)));
  const [intro, ...body] = lines;
  return (
    // the intro types over the space the rest will fill, so nothing jumps
    <div className="relative flex flex-col gap-1.5">
      {now.intro && (
        <p
          className="absolute inset-x-0 top-0 transition-opacity"
          style={{
            opacity: now.intro.fading ? 0 : 1,
            transitionDuration: `${FADE_MS}ms`,
          }}
        >
          <Typed text={intro} typed={now.intro.text} />
        </p>
      )}
      {body.map((line, i) => (
        <p key={line}>
          <Typed text={line} typed={now.body[i]} />
        </p>
      ))}
    </div>
  );
}

/** A briefing: the intro types and fades, then the lines that matter stay */
export function TypedBriefing({ lines }: { lines: string[] }) {
  return <BriefingNow key={lines.join('\n')} lines={lines} />;
}
