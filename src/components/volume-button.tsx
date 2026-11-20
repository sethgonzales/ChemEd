import { useEffect, useRef, useState } from 'react';
import { IconVolume, IconVolume2, IconVolumeOff } from '@tabler/icons-react';
import Button from '~/components/button';
import Slider from '~/components/slider';
import { useEscape } from '~/utils/use-escape';
import { useMuted, useVolume } from '~/utils/sounds';

/** The sound button: opens the volume and a mute switch, remembered in this browser */
export default function VolumeButton() {
  const [open, setOpen] = useState(false);
  const [muted, toggleMute] = useMuted();
  const [volume, setVolume] = useVolume();
  const ref = useRef<HTMLDivElement>(null);
  const percent = Math.round(volume * 100);

  const Icon =
    muted || percent === 0
      ? IconVolumeOff
      : percent < 50
        ? IconVolume2
        : IconVolume;

  // Escape closes the panel (not the page) and returns focus to its button
  useEscape(() => {
    setOpen(false);
    ref.current?.querySelector('button')?.focus();
  }, open);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);

  const changeVolume = (value: number) => {
    setVolume(value / 100);
    if (muted) toggleMute(); // moving the volume should be heard
  };

  return (
    // flex, so the button stretches to the header row like its neighbours
    <div ref={ref} className="relative flex">
      <Button expanded={open} onClick={() => setOpen(!open)}>
        <Icon size={20} aria-hidden="true" />
        <span className="sr-only">Sound</span>
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-2 w-56 p-4 space-y-3 pixel-control bg-primary-300 text-text-primary shadow">
          <div className="relative">
            <Slider
              label="Volume"
              value={percent}
              min={0}
              max={100}
              step={5}
              rangeSteps={0}
              onChange={changeVolume}
            />
            <span className="absolute right-0 top-0 text-sm">{percent}%</span>
          </div>
          <Button pressed={muted} onClick={toggleMute}>
            <span className="flex items-center gap-2 text-sm">
              <IconVolumeOff size={16} aria-hidden="true" />
              Mute
            </span>
            <span className="sr-only"> sounds</span>
          </Button>
        </div>
      )}
    </div>
  );
}
