import { useEffect } from 'react';
import { playClick } from '~/utils/sounds';

const CLICKABLE = 'button, input[type="checkbox"], input[type="radio"]';

/**
 * Gives every button and checkbox in the app the same quiet click, so new
 * controls get it for free. A control picks its sound with data-sound: "tap"
 * for picking an element or box, "none" when it plays its own (doors, tiles).
 */
export default function ClickSounds() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // the path the click took, fixed when it began: by now React may have
      // swapped out what was clicked (a mute button's icon)
      const el = e
        .composedPath()
        .find(
          (n): n is Element => n instanceof Element && n.matches(CLICKABLE),
        );
      if (!el || el.matches(':disabled, [aria-disabled="true"]')) return;
      const sound = el.getAttribute('data-sound');
      if (sound === 'none') return;
      playClick(sound === 'tap' ? 'tap' : 'tick');
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  return null;
}
