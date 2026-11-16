import { applyReadableFont, fontScript, isReadableFont } from './font';

const html = document.documentElement;

beforeEach(() => {
  localStorage.clear();
  delete html.dataset.font;
});

describe('readable font', () => {
  it('starts with the pixel font', () => {
    expect(isReadableFont()).toBe(false);
  });

  it('switches the whole page to the plain font and back', () => {
    applyReadableFont(true);
    expect(html.dataset.font).toBe('readable');
    applyReadableFont(false);
    expect(html.dataset.font).toBeUndefined();
  });

  it('is remembered in this browser', () => {
    applyReadableFont(true);
    expect(isReadableFont()).toBe(true);
    applyReadableFont(false);
    expect(isReadableFont()).toBe(false);
  });

  it('is put back before the first paint by the head script', () => {
    applyReadableFont(true);
    delete html.dataset.font;
    new Function(fontScript())();
    expect(html.dataset.font).toBe('readable');
  });

  it('leaves the pixel font alone when nothing was saved', () => {
    new Function(fontScript())();
    expect(html.dataset.font).toBeUndefined();
  });
});
