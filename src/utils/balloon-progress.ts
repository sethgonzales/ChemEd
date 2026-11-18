import type { Course } from '~/utils/quest';

// Balloon Riser's stars, kept in this browser per course, like the quest's
// progress, until students log in.

const KEY = 'chem.balloon.stars';

export type Stars = Partial<Record<Course, Record<string, number>>>;

/** Three for a clean level, two for a miss or two, one otherwise */
export const starsFor = (misses: number) =>
  misses === 0 ? 3 : misses <= 2 ? 2 : 1;

export function loadStars(): Stars {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return typeof saved === 'object' && saved && !Array.isArray(saved)
      ? saved
      : {};
  } catch {
    return {}; // blocked storage or a broken value: start fresh
  }
}

/** Saves a level's stars, keeping the best so far */
export function saveStars(course: Course, level: string, stars: number) {
  const all = loadStars();
  const best = Math.max(stars, all[course]?.[level] ?? 0);
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ ...all, [course]: { ...all[course], [level]: best } }),
    );
  } catch {
    // storage can be blocked; the stars just won't last past this visit
  }
}
