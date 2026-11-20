import { useEffect, useRef, useState } from 'react';

// The sticky header shrinks once the page scrolls, giving the page back, and
// grows again at the top. It grows nearer the top than it shrinks, so a page
// resting between the two doesn't make it flicker.
//
// The browser keeps the content still as the header changes size (scroll
// anchoring): shrinking pulls the scroll back by what the header loses. So it
// only shrinks where the scroll, pulled back, is still well clear of the top,
// or it would grow straight back and bounce between the two for ever.

const SHRINK_AT = 48; // px scrolled, once pulled back
const GROW_AT = 8; // px scrolled

interface Scroll {
  scrollY: number; // px
  // px the page can still scroll with the header full size, less its height:
  // shrinking takes about that much off the page
  room: number;
  shrinkBy?: number; // px the header loses by shrinking
}

/** Whether the header should be compact, given whether it is now */
export function nextCompact(
  compact: boolean,
  { scrollY, room, shrinkBy = 0 }: Scroll,
) {
  if (compact) return scrollY > GROW_AT;
  // on a short page, shrinking would end the scroll and snap it back up
  return scrollY - shrinkBy > SHRINK_AT && room > SHRINK_AT;
}

/** [compact, ref for the header], following the page's scroll */
export function useCompactHeader() {
  const [compact, setCompact] = useState(false);
  const ref = useRef<HTMLElement>(null);
  // px tall once shrunk, the least seen while compact (it eases there); until
  // it's first shrunk, 0, so the whole header bounds what it can lose
  const compactHeight = useRef(0);
  const compactNow = useRef(false);

  useEffect(() => {
    const update = () => {
      const page = document.documentElement;
      const height = ref.current?.offsetHeight ?? 0;
      if (compactNow.current)
        compactHeight.current = compactHeight.current
          ? Math.min(compactHeight.current, height)
          : height;
      const room = page.scrollHeight - window.innerHeight - height;
      const shrinkBy = Math.max(0, height - compactHeight.current);
      setCompact((was) => {
        const next = nextCompact(was, {
          scrollY: window.scrollY,
          room,
          shrinkBy,
        });
        compactNow.current = next;
        return next;
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return [compact, ref] as const;
}
