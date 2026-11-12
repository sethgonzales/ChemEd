import PixelArt from '~/components/pixel-art';
import { FRAMES, PALETTE, type Frame } from '~/constants/mr-g-sprite';

interface Props {
  frame?: Frame;
  height?: number; // px; width follows the sprite's proportions
  className?: string;
}

/** Mr. G as crisp 8-bit pixel art */
export default function MrG({ frame = 'idle', height = 96, className }: Props) {
  return (
    <PixelArt
      rows={FRAMES[frame]}
      palette={PALETTE}
      label="Mr. G"
      height={height}
      className={className}
      data-frame={frame}
    />
  );
}
