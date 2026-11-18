import { useId, useState } from 'react';
import type { Device } from '~/components/balloon-devices';
import { cn } from '~/utils/cn';
import { useEscape } from '~/utils/use-escape';

export type Opens = 'down' | 'up' | 'left';
export const CARD_WIDTH = 192; // CSS px: w-48, narrow enough beside a phone's gauge column

const CARD: Record<Opens, string> = {
  down: 'left-1/2 top-full mt-1',
  up: 'left-1/2 bottom-full mb-1',
  left: 'right-full top-0 mr-2',
};

interface Props {
  device: Device;
  opens?: Opens; // which way it expands, to stay inside the scene
  shift?: number; // px to nudge an up or down card sideways, off the scene's edges
}

/**
 * An instrument in the scene: always showing its live reading, and expanding
 * on hover, focus or a tap to show it up close and say what it measures
 */
export default function Gauge({ device, opens = 'down', shift = 0 }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  useEscape(() => setOpen(false), open);

  return (
    <div
      className={cn('relative', open && 'z-30')}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={`${device.name}: ${device.reading}`}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(true)}
        className="flex cursor-pointer flex-col items-center gap-0.5"
      >
        {/* the device itself, no badge behind it; a shadow lifts it off the sky */}
        <span className="block size-8 drop-shadow-[0_1px_1px_rgba(15,23,42,0.6)] sm:size-11">
          {device.picture}
        </span>
        <span className="whitespace-nowrap rounded-sm bg-[#10261a]/90 px-1 font-mono text-[10px] font-semibold leading-tight tabular-nums text-[#86efac] shadow sm:text-xs">
          {device.reading}
        </span>
      </button>
      {open && (
        <div
          id={id}
          className={cn(
            'absolute flex w-48 flex-col gap-1.5 rounded-sm bg-primary-700 p-2 text-left text-white shadow-lg ring-1 ring-primary-800',
            CARD[opens],
          )}
          style={
            opens === 'left'
              ? undefined
              : { transform: `translateX(calc(-50% + ${shift}px))` }
          }
        >
          {/* the device and its name side by side, the words below with the
              card's full width */}
          <span className="flex items-center gap-2">
            <span className="block size-10 shrink-0 sm:size-12">
              {device.picture}
            </span>
            <span className="flex min-w-0 flex-col items-start gap-1">
              <span className="text-sm font-semibold leading-tight">
                {device.name}
              </span>
              <span className="rounded-sm bg-[#10261a] px-1.5 font-mono text-base font-semibold tabular-nums text-[#86efac]">
                {device.reading}
              </span>
            </span>
          </span>
          <span className="font-sans text-xs leading-snug text-white/85">
            {device.measures}
          </span>
        </div>
      )}
    </div>
  );
}
