import { useEffect, useState } from 'react';

// Developer shortcuts (fly the right answer, solve a room…): always on while
// developing, and switchable in the deployed app with ?dev=on / ?dev=off,
// remembered in this browser, to test there without a dev build
export const DEV_STORAGE_KEY = 'chem.devTools';
const PRODUCTION = process.env.NODE_ENV === 'production';

interface Where {
  production: boolean;
  search: string; // the address's ?query
  stored: string | null; // what this browser remembered
}

/** Whether the shortcuts are on, and what to remember ('off' forgets) */
export function devToolsFrom({ production, search, stored }: Where) {
  const asked = new URLSearchParams(search).get('dev');
  if (asked === 'on' || asked === 'off')
    return { on: asked === 'on', store: asked };
  return { on: !production || stored === 'on', store: null };
}

/** Whether to show the developer shortcuts */
export function useDevTools({ production = PRODUCTION } = {}) {
  const [on, setOn] = useState(!production);
  // read after mount, so the static page and its first render match
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(DEV_STORAGE_KEY);
    } catch {
      // storage can be blocked: then ?dev=on lasts for the one page
    }
    const now = devToolsFrom({
      production,
      search: window.location.search,
      stored,
    });
    try {
      if (now.store === 'on') localStorage.setItem(DEV_STORAGE_KEY, 'on');
      if (now.store === 'off') localStorage.removeItem(DEV_STORAGE_KEY);
    } catch {
      // as above
    }
    setOn(now.on);
  }, [production]);
  return on;
}
