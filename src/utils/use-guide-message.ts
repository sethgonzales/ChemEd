import { useEffect, useRef } from 'react';
import { useGuide } from '~/components/guide';
import type { GuideMessage } from '~/utils/guide';

/**
 * Has Mr. G say a message once it has held steady for delayMs, and not again
 * until it changes. Pass null to keep him quiet.
 */
export function useGuideMessage(message: GuideMessage | null, delayMs: number) {
  const { say } = useGuide();
  const lastSaid = useRef<string | null>(null);
  const text = message?.text ?? null;
  const mood = message?.mood;

  useEffect(() => {
    if (!text || text === lastSaid.current) return;
    const timer = setTimeout(() => {
      lastSaid.current = text;
      say(text, mood);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [text, mood, delayMs, say]);
}
