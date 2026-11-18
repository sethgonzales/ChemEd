import { useEffect, useRef, useState } from 'react';

// The sticky header shrinks once the page scrolls, giving the page back, and
// grows again at the top. It grows nearer the top than it shrinks, so a page
// resting between the two doesn't make it flicker.

const SHRINK_AT = 48; // px scrolled
const GROW_AT = 8; // px scrolled

interface Scroll {
  scrollY: number; // px
  // px the page can still scroll with the header full size, less its height:
  // shrinking takes about that much off the page
  room: number;
}

/** Whether the header should be compact, given whether it is now */
export function nextCompact(compact: boolean, { scrollY, room }: Scroll) {
  if (compact) return scrollY > GROW_AT;
  // on a short page, shrinking would end the scroll and snap it back up
  return scrollY > SHRINK_AT && room > SHRINK_AT;
}

/** [compact, ref for the header], following the page's scroll */
export function useCompactHeader() {
  const [compact, setCompact] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const update = () => {
      const page = document.documentElement;
      const room =
        page.scrollHeight -
        window.innerHeight -
        (ref.current?.offsetHeight ?? 0);
      setCompact((was) => nextCompact(was, { scrollY: window.scrollY, room }));
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
