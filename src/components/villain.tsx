import { useEffect, useRef, useState } from 'react';
import PixelArt from '~/components/pixel-art';
import { PIXEL } from '~/utils/pixel';
import { useMedia } from '~/utils/use-media';
import { HIT_SHAKE, defeatRows, hitPalette } from '~/utils/villain-effects';

const FRAME_MS = 90; // about 11 frames a second, for a chunky 8-bit feel
const LUNGE = 3; // art pixels it moves forward at the height of an attack

export const DURATION_MS = { attack: 700, hit: 450, defeat: 1500 };

export type VillainMode = 'idle' | keyof typeof DURATION_MS;

/** A boss: its picture is drawn fresh each frame from its own code */
export interface VillainArt {
  name: string;
  size: number; // art pixels square
  palette: Record<string, string>;
  dust: { key: string; dir: number }; // what it breaks into, and which way
  draw: (t: number, attack: number) => string[];
}

interface Props {
  villain: VillainArt;
  mode: VillainMode;
  onDone?: () => void; // when an attack, hit or defeat has played
  scale?: number; // app pixels per art pixel
  className?: string;
}

// a flash on the hit, then a second, shorter one
const flashing = (ms: number) => ms < 140 || (ms > 220 && ms < 300);

/** A villain, idling or playing an attack, a hit or its defeat */
export default function Villain({
  villain,
  mode,
  onDone,
  scale = 1,
  className,
}: Props) {
  const reducedMotion = useMedia('(prefers-reduced-motion: reduce)');
  const [now, setNow] = useState(() => Date.now());
  const start = useRef(now);
  const done = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    start.current = Date.now();
    done.current = false;
    setNow(start.current);
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (mode === 'idle' || done.current) return;
      if (t - start.current >= DURATION_MS[mode]) {
        done.current = true;
        onDoneRef.current?.();
      }
    }, FRAME_MS);
    return () => clearInterval(id);
  }, [mode]);

  const elapsed = now - start.current;
  const playing = mode !== 'idle' && elapsed < DURATION_MS[mode];
  const attack =
    mode === 'attack' && playing
      ? Math.sin((elapsed / DURATION_MS.attack) * Math.PI)
      : 0;
  let rows = villain.draw(reducedMotion ? 0 : now / 1000, attack);
  if (mode === 'defeat') {
    if (!playing) rows = rows.map((r) => '.'.repeat(r.length));
    else if (!reducedMotion)
      rows = defeatRows(
        rows,
        elapsed / DURATION_MS.defeat,
        villain.dust.dir,
        villain.dust.key,
      );
  }
  const hit = mode === 'hit' && playing;
  const shakeX =
    hit && !reducedMotion
      ? HIT_SHAKE[
          Math.min(HIT_SHAKE.length - 1, Math.floor(elapsed / FRAME_MS))
        ]
      : 0;
  const lungeY = reducedMotion ? 0 : Math.round(attack * LUNGE);
  const px = PIXEL * scale;

  return (
    <PixelArt
      rows={rows}
      palette={
        hit && flashing(elapsed) ? hitPalette(villain.palette) : villain.palette
      }
      label={villain.name}
      scale={scale}
      className={className}
      data-frame={mode}
      style={{ transform: `translate(${shakeX * px}px, ${lungeY * px}px)` }}
    />
  );
}
