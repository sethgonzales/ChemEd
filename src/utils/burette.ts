import { BURETTE_CAPACITY } from '~/constants/titrations';

const CLOSE_UP_SPAN = 2; // mL of scale shown in the close-up

export type ScaleMark = { volume: number; size: 'mL' | 'half' | 'tenth' };

/*
 * A 50 mL burette is graduated every 0.1 mL, so a reading estimates one more
 * digit between marks: to 0.01 mL.
 */
export function scaleMarks(from: number, to: number): ScaleMark[] {
  // count in tenths so 0.1 steps don't drift
  const first = Math.max(0, Math.ceil(from * 10 - 1e-9));
  const last = Math.min(BURETTE_CAPACITY * 10, Math.floor(to * 10 + 1e-9));
  const marks: ScaleMark[] = [];
  for (let tenths = first; tenths <= last; tenths++) {
    const size = tenths % 10 === 0 ? 'mL' : tenths % 5 === 0 ? 'half' : 'tenth';
    marks.push({ volume: tenths / 10, size });
  }
  return marks;
}

/** The stretch of scale the close-up shows: centred on the reading where it can be */
export function closeUpWindow(volume: number) {
  const from = Math.min(
    Math.max(0, volume - CLOSE_UP_SPAN / 2),
    BURETTE_CAPACITY - CLOSE_UP_SPAN,
  );
  const round = (v: number) => Math.round(v * 100) / 100;
  return { from: round(from), to: round(from + CLOSE_UP_SPAN) };
}
