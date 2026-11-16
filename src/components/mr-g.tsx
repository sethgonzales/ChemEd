import PixelArt from '~/components/pixel-art';
import {
  PALETTE,
  SPRITE_HEIGHT,
  spriteRows,
  type Frame,
} from '~/constants/mr-g-sprite';
import { PIXEL } from '~/utils/pixel';

// px. Off the 4px grid on purpose: at 4px pixels he stood 120px tall and got
// in the way, so he keeps his original size.
const HEIGHT = 96;

interface Props {
  frame?: Frame;
  className?: string;
  goggles?: boolean; // over his eyes, for a wet lab
}

/** Mr. G as crisp 8-bit pixel art */
export default function MrG({
  frame = 'idle',
  className,
  goggles = false,
}: Props) {
  return (
    <PixelArt
      rows={spriteRows(frame, goggles)}
      palette={PALETTE}
      label={goggles ? 'Mr. G, wearing safety goggles' : 'Mr. G'}
      scale={HEIGHT / (SPRITE_HEIGHT * PIXEL)}
      className={className}
      data-frame={frame}
    />
  );
}
