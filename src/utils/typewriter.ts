// Mr. G's lines typed out as he says them, like a radio message coming in
export const TYPE_RATE = 45; // characters/s
export const INTRO_HOLD_MS = 1200; // the whole intro stays this long, then fades
export const FADE_MS = 500; // the intro's fade out
export const LINE_PAUSE_MS = 250; // between one line finishing and the next

/** How long a line takes to type out, ms */
export const typingMs = (text: string) => (text.length / TYPE_RATE) * 1000;

/** As much of the text as is typed out after ms */
export function typedAt(text: string, ms: number): string {
  return text.slice(0, Math.max(0, Math.floor((ms / 1000) * TYPE_RATE)));
}

export interface BriefingNow {
  intro: { text: string; fading: boolean } | null; // null once it's faded
  body: string[]; // each line as typed so far, '' until it starts
  done: boolean;
}

// when each part of a briefing starts, ms in
function timeline(lines: string[]) {
  const [intro = '', ...body] = lines;
  const fadeFrom = typingMs(intro) + INTRO_HOLD_MS;
  const bodyFrom = fadeFrom + FADE_MS;
  const starts: number[] = [];
  let at = bodyFrom;
  for (const line of body) {
    starts.push(at);
    at += typingMs(line) + LINE_PAUSE_MS;
  }
  return { intro, body, fadeFrom, bodyFrom, starts, end: at - LINE_PAUSE_MS };
}

/** How long a whole briefing takes, ms */
export const briefingMs = (lines: string[]) => timeline(lines).end;

/**
 * A briefing ms after it starts: the intro ("Next stop…") types and fades,
 * then the lines that matter type in one after another and stay
 */
export function briefingAt(lines: string[], ms: number): BriefingNow {
  const { intro, body, fadeFrom, bodyFrom, starts, end } = timeline(lines);
  return {
    intro:
      ms < bodyFrom
        ? { text: typedAt(intro, ms), fading: ms >= fadeFrom }
        : null,
    body: body.map((line, i) => typedAt(line, ms - starts[i])),
    done: ms >= end,
  };
}
