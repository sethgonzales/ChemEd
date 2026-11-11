import {
  isBalanced,
  isLowestTerms,
  parseEquation,
  solve,
} from '~/utils/reactions';
import { REACTION_LEVELS, REACTIONS } from './reactions';

describe('REACTIONS', () => {
  it('has unique ids and reactions at every level', () => {
    expect(new Set(REACTIONS.map((r) => r.id)).size).toBe(REACTIONS.length);
    for (const level of Object.keys(REACTION_LEVELS).map(Number)) {
      expect(
        REACTIONS.filter((r) => r.level === level).length,
      ).toBeGreaterThanOrEqual(4);
    }
  });

  it.each(REACTIONS)('$name: the answer is the smallest balanced one', (r) => {
    const reaction = parseEquation(r.equation);
    expect(r.answer).toHaveLength(
      reaction.reactants.length + reaction.products.length,
    );
    expect(isBalanced(reaction, r.answer)).toBe(true);
    expect(isLowestTerms(r.answer)).toBe(true);
    expect(solve(reaction)).toEqual(r.answer);
  });

  it.each(REACTIONS)('$name: needs balancing from all 1s', (r) => {
    const reaction = parseEquation(r.equation);
    expect(
      isBalanced(
        reaction,
        r.answer.map(() => 1),
      ),
    ).toBe(false);
  });
});
