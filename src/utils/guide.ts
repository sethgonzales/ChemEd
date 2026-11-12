// Timing and movement for Mr. G, the in-app guide

import { ELEMENTS } from '~/constants/elements';
import { GENERAL_TIPS, PAGE_TIPS } from '~/constants/guide-tips';
import type { Feedback, Verdict } from '~/utils/lewis';
import {
  elementTally,
  isBalanced,
  isLowestTerms,
  type Reaction,
} from '~/utils/reactions';

export const BUBBLE_MIN_MS = 4000;
export const BUBBLE_MAX_MS = 10000;
const MS_PER_CHARACTER = 60; // roughly reading speed

export const WANDER_RANGE_PX = 160; // how far along the bottom he roams
const MIN_STEP_PX = 24; // shorter moves look like a twitch, not a walk

/** How long a speech bubble stays open: longer for longer messages */
export function bubbleDuration(text: string) {
  return Math.min(
    BUBBLE_MAX_MS,
    Math.max(BUBBLE_MIN_MS, 3000 + text.length * MS_PER_CHARACTER),
  );
}

/** Where he wanders to next, somewhere in his patch but not right where he is */
export function nextWanderX(
  current: number,
  random: () => number = Math.random,
) {
  const target = random() * WANDER_RANGE_PX;
  if (Math.abs(target - current) >= MIN_STEP_PX) return target;
  // too close: step the minimum distance toward whichever side has room
  return current + MIN_STEP_PX <= WANDER_RANGE_PX
    ? current + MIN_STEP_PX
    : current - MIN_STEP_PX;
}

export const WELCOME_DELAY_MS = 1500; // let the page settle before he speaks

/** The tips for a page, or general ones if it has none */
export function tipsFor(page: string) {
  return PAGE_TIPS[page] ?? GENERAL_TIPS;
}

/** The first time he speaks in a session, he introduces himself */
export function withGreeting(text: string, greeted: boolean) {
  return greeted ? text : `Hi, I'm Mr. G! ${text}`;
}

export type GuideMessage = { text: string; mood: 'tip' | 'hint' | 'cheer' };

const elementName = (symbol: string) =>
  ELEMENTS.find((e) => e.symbol === symbol)?.name ?? symbol;

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** What he says about an equation the student is balancing */
export function balanceMessage(
  r: Reaction,
  coefficients: number[],
): GuideMessage | null {
  // a blank box is mid-edit, not a mistake
  if (coefficients.some((c) => c <= 0)) return null;
  if (isBalanced(r, coefficients)) {
    return isLowestTerms(coefficients)
      ? { mood: 'cheer', text: 'Balanced! Every element matches. Nice work!' }
      : {
          mood: 'hint',
          text: `Balanced, but those numbers could be smaller. They all divide by ${coefficients.reduce(gcd)}.`,
        };
  }
  const off = elementTally(r, coefficients).find(
    (row) => row.reactants !== row.products,
  )!;
  return {
    mood: 'hint',
    text: `${elementName(off.element)} is off: ${off.reactants} on the left, ${off.products} on the right.`,
  };
}

/** What he says after Check your work */
export function checkMessage(
  verdict: Verdict,
  feedback: Feedback[],
): GuideMessage {
  const first = feedback[0]?.message ?? '';
  switch (verdict) {
    case 'best':
      return { mood: 'cheer', text: 'Textbook Lewis structure! Great work.' };
    case 'accepted':
      return { mood: 'cheer', text: 'That works! Nicely done.' };
    case 'valid':
      return { mood: 'hint', text: `So close! ${first}`.trim() };
    default:
      return { mood: 'hint', text: `Not quite yet. ${first}`.trim() };
  }
}

export type Phase = 'Solid' | 'Liquid' | 'Gas';

const PHASE_CHANGES: Record<string, string> = {
  'Solid>Liquid':
    'It’s melting! The particles have enough energy to slide past each other.',
  'Liquid>Gas':
    'It’s boiling! The particles are breaking free and flying apart.',
  'Gas>Liquid':
    'It’s condensing. The particles are slowing down and clumping back together.',
  'Liquid>Solid': 'It’s freezing. The particles are locking into place.',
  'Solid>Gas': 'You heated it right past melting and boiling. Now it’s a gas!',
  'Gas>Solid':
    'You cooled it right past condensing and freezing. Now it’s a solid!',
};

/** What he says when the substance changes phase */
export const phaseMessage = (from: Phase, to: Phase) =>
  PHASE_CHANGES[`${from}>${to}`];

export const CHEER_DELAY_MS = 500; // a beat after the last change, so it lands on the result
export const HINT_PAUSE_MS = 3000; // hints wait until the student stops changing things
export const PHASE_SETTLE_MS = 800; // let the slider settle before naming a phase change
