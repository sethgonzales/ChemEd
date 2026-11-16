import PixelArt from '~/components/pixel-art';
import { PALETTE, spriteRows, type Frame } from '~/constants/mr-g-sprite';

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
      className={className}
      data-frame={frame}
    />
  );
}
