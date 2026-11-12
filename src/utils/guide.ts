// Timing and movement for Mr. G, the in-app guide

import { GENERAL_TIPS, PAGE_TIPS } from '~/constants/guide-tips';

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
