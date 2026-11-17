import { useEffect, useState } from 'react';
import PixelArt from '~/components/pixel-art';
import {
  PALETTE,
  SPRITE_HEIGHT,
  spriteRows,
  type Frame,
} from '~/constants/mr-g-sprite';
import {
  FLAME_PALETTES,
  QUEST_PALETTE,
  questOutfit,
} from '~/constants/quest-outfit';
import { PIXEL } from '~/utils/pixel';
import { useMedia } from '~/utils/use-media';

// px. Off the 4px grid on purpose: at 4px pixels he stood 120px tall and got
// in the way, so he keeps his original size.
const HEIGHT = 96;
const FLICKER_MS = 150; // between flame colours

interface Props {
  frame?: Frame;
  className?: string;
  goggles?: boolean; // over his eyes, for a wet lab
  cloak?: boolean; // hooded, with a lantern, for the Dungeon Quest
}

/** The lantern's flame colours, changing every so often unless motion is reduced */
function useFlame(on: boolean) {
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)');
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!on || reducedMotion) return;
    const id = setInterval(() => setStep((s) => s + 1), FLICKER_MS);
    return () => clearInterval(id);
  }, [on, reducedMotion]);
  return FLAME_PALETTES[reducedMotion ? 0 : step % FLAME_PALETTES.length];
}

/** Mr. G as crisp 8-bit pixel art */
export default function MrG({
  frame = 'idle',
  className,
  goggles = false,
  cloak = false,
}: Props) {
  const flame = useFlame(cloak);
  const label = cloak
    ? 'Mr. G, in a hooded cloak, carrying a lantern'
    : goggles
      ? 'Mr. G, wearing safety goggles'
      : 'Mr. G';
  return (
    <PixelArt
      rows={
        cloak
          ? questOutfit(spriteRows(frame, false))
          : spriteRows(frame, goggles)
      }
      palette={cloak ? { ...PALETTE, ...QUEST_PALETTE, ...flame } : PALETTE}
      label={label}
      scale={HEIGHT / (SPRITE_HEIGHT * PIXEL)}
      className={className}
      data-frame={frame}
    />
  );
}
