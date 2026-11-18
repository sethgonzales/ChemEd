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
        <span className="block size-8 rounded-full bg-primary-800/85 p-0.5 shadow ring-1 ring-white/40 sm:size-11">
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
            'absolute flex w-48 gap-2 rounded-sm bg-primary-700 p-2 text-left text-white shadow-lg ring-1 ring-primary-800',
            CARD[opens],
          )}
          style={
            opens === 'left'
              ? undefined
              : { transform: `translateX(calc(-50% + ${shift}px))` }
          }
        >
          <span className="block size-12 shrink-0 sm:size-16">
            {device.picture}
          </span>
          <span className="flex min-w-0 flex-col gap-1">
            <span className="text-xs font-semibold">{device.name}</span>
            <span className="self-start rounded-sm bg-[#10261a] px-1.5 font-mono text-sm font-semibold tabular-nums text-[#86efac]">
              {device.reading}
            </span>
            <span className="font-sans text-[11px] leading-snug text-white/85">
              {device.measures}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
