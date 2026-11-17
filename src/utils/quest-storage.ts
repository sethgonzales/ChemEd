// The Dungeon Quest's saved progress and setup. Kept in this browser for now,
// behind these four functions, so Firestore can take over once students log in.

import {
  COURSES,
  type Course,
  type Progress,
  type QuestSetup,
} from '~/utils/quest';

const PROGRESS_KEY = 'chem.quest.progress';
const SETUP_KEY = 'chem.quest.setup';

function read(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null');
  } catch {
    return null; // blocked storage or a broken value: start fresh
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage can be blocked; progress just won't last past this visit
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export function loadProgress(): Progress {
  const saved = read(PROGRESS_KEY);
  return isRecord(saved) ? (saved as Progress) : {};
}

export const saveProgress = (p: Progress) => write(PROGRESS_KEY, p);

/** The last setup, keeping only topics that still exist; null if none is left */
export function loadSetup(all: string[]): QuestSetup | null {
  const saved = read(SETUP_KEY);
  if (!isRecord(saved) || !Array.isArray(saved.topics)) return null;
  const topics = all.filter((id) => (saved.topics as unknown[]).includes(id));
  if (!topics.length) return null;
  const course =
    typeof saved.course === 'string' && saved.course in COURSES
      ? (saved.course as Course)
      : 'general';
  return { topics, course };
}

export const saveSetup = (s: QuestSetup) => write(SETUP_KEY, s);
