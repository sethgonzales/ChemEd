import { PALETTE, spriteRows, type Frame } from '~/constants/mr-g-sprite';

/**
 * The player's character in the games: any sprite on Mr. G's 20 × 30 grid,
 * sharing his frames. Mr. G for now; a student's avatar once they can build
 * one.
 */
export interface Rider {
  name: string; // for screen readers: "Mr. G in the balloon's basket"
  rows: (frame: Frame) => string[];
  palette: Record<string, string>;
}

export const MR_G: Rider = {
  name: 'Mr. G',
  rows: (frame) => spriteRows(frame, false),
  palette: PALETTE,
};
