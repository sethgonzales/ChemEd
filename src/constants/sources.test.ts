import { SOURCES } from './sources';

describe('SOURCES', () => {
  it.each(Object.entries(SOURCES))(
    '%s is a full citation: what it backs, who, when, what and where',
    (_, s) => {
      for (const field of [s.topic, s.author, s.title, s.publisher]) {
        expect(field.trim()).not.toBe('');
      }
      expect(s.year).toBeGreaterThanOrEqual(1900);
      expect(s.year).toBeLessThanOrEqual(new Date().getFullYear());
      expect(s.url).toMatch(/^https:\/\//);
    },
  );

  // a DOI never changes; a web page can, so say when we read it
  it.each(
    Object.entries(SOURCES).filter(([, s]) => !s.url.includes('doi.org')),
  )('%s, a web page, says when it was accessed', (_, s) => {
    expect(s.accessed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
