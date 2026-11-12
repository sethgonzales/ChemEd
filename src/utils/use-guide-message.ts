import { useEffect, useRef } from 'react';
import { useGuide } from '~/components/guide';
import { NUDGE_AFTER_MS, type GuideMessage } from '~/utils/guide';

/**
 * Has Mr. G say a message once it has held steady for delayMs, and not again
 * until it changes. Pass null to keep him quiet. Hints are unprompted (rationed);
 * cheers answer what the student just did.
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
      say(text, mood, { unprompted: mood !== 'cheer' });
    }, delayMs);
    return () => clearTimeout(timer);
  }, [text, mood, delayMs, say]);
}

/** Nudges once if the student stays stuck for NUDGE_AFTER_MS */
export function useGuideNudge(stuck: boolean, text: string) {
  const { say } = useGuide();
  const nudged = useRef(false);

  useEffect(() => {
    if (!stuck || nudged.current) return;
    const timer = setTimeout(() => {
      nudged.current = true;
      say(text, 'nudge', { unprompted: true });
    }, NUDGE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [stuck, text, say]);
}
