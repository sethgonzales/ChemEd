import type { ReactNode } from 'react';
import PixelArt from '~/components/pixel-art';
import { BALLOON_PALETTE, balloonOutfit } from '~/constants/balloon-outfit';
import { MR_G, type Rider } from '~/constants/riders';
import { cn } from '~/utils/cn';

interface Props {
  rider?: Rider;
  children: ReactNode;
  className?: string;
}

/** The rider, head and shoulders in the flying outfit, talking the leg through */
export default function BalloonRadio({
  rider = MR_G,
  children,
  className,
}: Props) {
  return (
    <section
      aria-label={rider.name}
      className={cn(
        'flex items-start gap-3 rounded-sm bg-primary-700 p-3 text-white',
        className,
      )}
    >
      <PixelArt
        rows={balloonOutfit(rider.rows('idle'))}
        palette={{ ...rider.palette, ...BALLOON_PALETTE }}
        label={`${rider.name}, in flying goggles and a scarf`}
        scale={0.6}
        className="shrink-0"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 font-pixel text-base font-medium leading-normal">
        {children}
      </div>
    </section>
  );
}
