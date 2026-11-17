/** The story lines as far as `typed` letters have been typed, one line after another */
export function typedLines(lines: string[], typed: number): string[] {
  let left = Math.max(0, typed);
  return lines.map((line) => {
    const shown = line.slice(0, left);
    left -= shown.length;
    return shown;
  });
}
