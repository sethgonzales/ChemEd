import { typedLines } from './typed-text';

describe('typedLines', () => {
  const LINES = ['Hello there.', 'Ready?'];

  it('shows nothing before typing starts', () => {
    expect(typedLines(LINES, 0)).toEqual(['', '']);
  });

  it('types the first line before starting the next', () => {
    expect(typedLines(LINES, 5)).toEqual(['Hello', '']);
    expect(typedLines(LINES, 14)).toEqual(['Hello there.', 'Re']);
  });

  it('shows it all once enough has been typed, and never more', () => {
    expect(typedLines(LINES, 1000)).toEqual(LINES);
  });
});
