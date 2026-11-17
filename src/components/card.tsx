import type { CSSProperties } from 'react';
import { IconLock } from '@tabler/icons-react';
import PixelArt from '~/components/pixel-art';
import { DOOR_ART, type DoorArtName } from '~/constants/door-art';
import { cn } from '~/utils/cn';
import { useDoorSound } from '~/utils/sounds';

interface Props {
  title: string;
  color: string; // the simulation's own colour
  art: DoorArtName;
  ready: boolean; // false: a sealed door that says "Coming soon"
  wide?: boolean; // a game's door: short and wide, its name beside the art
  onClick: () => void;
}

/** A simulation's chamber door on the home page */
export default function Card({
  title,
  color,
  art,
  ready,
  wide = false,
  onClick,
}: Props) {
  const playDoor = useDoorSound();
  const open = () => {
    playDoor();
    onClick();
  };

  return (
    <button
      type="button"
      onClick={ready ? open : undefined}
      data-sound="none" // it thuds instead
      aria-disabled={!ready || undefined}
      aria-label={ready ? undefined : `${title} (coming soon)`}
      className={cn(
        'stone-wall pixel-frame torchlight flex p-3 gap-3 focus-visible:outline-none',
        wide ? 'h-44 flex-row items-stretch' : 'h-78 flex-col',
        ready ? 'cursor-pointer' : 'cursor-not-allowed',
      )}
      style={{ '--door': color } as CSSProperties}
    >
      {/* the archway, dark inside and lit in the simulation's colour */}
      <span
        className={cn(
          'door-arch relative min-h-0 flex items-center justify-center overflow-hidden',
          wide ? 'w-1/2 shrink-0 p-2' : 'flex-1 w-full p-6',
        )}
      >
        <PixelArt
          {...DOOR_ART[art]}
          className={cn('shrink-0', !ready && 'opacity-30 grayscale')}
        />
        {!ready && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            {/* boarded up */}
            <span className="absolute h-5 w-[120%] -rotate-12 bg-amber-900 shadow-[inset_0_calc(-1*var(--pixel))_0_rgb(0_0_0/0.3)]" />
            <span className="absolute h-5 w-[120%] rotate-12 bg-amber-800 shadow-[inset_0_calc(-1*var(--pixel))_0_rgb(0_0_0/0.3)]" />
            <span className="relative pixel-control bg-stone-300 p-1.5 text-stone-800">
              <IconLock size={20} stroke={2.5} aria-hidden="true" />
            </span>
            <span className="relative pixel-control bg-amber-200 px-2 pt-1 pb-1.5 font-pixel text-sm text-amber-950">
              Coming soon
            </span>
          </span>
        )}
      </span>
      <span
        className={cn(
          'pixel-control bg-stone-800 px-3 pt-1 pb-1.5 font-pixel text-xl text-center text-stone-100',
          wide && 'self-center flex-1',
        )}
      >
        {title}
      </span>
    </button>
  );
}
