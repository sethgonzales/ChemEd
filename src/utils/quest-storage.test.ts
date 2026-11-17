import {
  loadProgress,
  loadSetup,
  saveProgress,
  saveSetup,
} from './quest-storage';

const ALL = ['balancing', 'lewis'];

beforeEach(() => localStorage.clear());

describe('quest progress', () => {
  it('starts empty, then keeps what was saved', () => {
    expect(loadProgress()).toEqual({});
    saveProgress({ general: { balancing: 2 } });
    expect(loadProgress()).toEqual({ general: { balancing: 2 } });
  });

  it('ignores anything broken it finds', () => {
    localStorage.setItem('chem.quest.progress', '{not json');
    expect(loadProgress()).toEqual({});
    localStorage.setItem('chem.quest.progress', '[1,2]');
    expect(loadProgress()).toEqual({});
  });

  it('carries on when storage is blocked', () => {
    const get = jest
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('blocked');
      });
    const set = jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('blocked');
      });
    expect(loadProgress()).toEqual({});
    expect(() => saveProgress({})).not.toThrow();
    get.mockRestore();
    set.mockRestore();
  });
});

describe('quest setup', () => {
  it('is null until one is chosen', () => {
    expect(loadSetup(ALL)).toBeNull();
  });

  it('keeps the chosen topics and course', () => {
    saveSetup({ topics: ['lewis'], course: 'ap' });
    expect(loadSetup(ALL)).toEqual({ topics: ['lewis'], course: 'ap' });
  });

  it('drops topics that no longer exist, and forgets a setup with none left', () => {
    saveSetup({ topics: ['lewis', 'gone'], course: 'general' });
    expect(loadSetup(ALL)).toEqual({ topics: ['lewis'], course: 'general' });
    saveSetup({ topics: ['gone'], course: 'general' });
    expect(loadSetup(ALL)).toBeNull();
  });
});
