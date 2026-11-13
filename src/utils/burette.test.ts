import { closeUpWindow, scaleMarks } from './burette';

describe('scaleMarks', () => {
  it('marks every 0.1 mL, longer at each 0.5 mL and labelled at each mL', () => {
    const marks = scaleMarks(23.8, 24.6);
    expect(marks.map((m) => m.volume)).toEqual([
      23.8, 23.9, 24, 24.1, 24.2, 24.3, 24.4, 24.5, 24.6,
    ]);
    expect(marks.find((m) => m.volume === 24)!.size).toBe('mL');
    expect(marks.find((m) => m.volume === 24.5)!.size).toBe('half');
    expect(marks.find((m) => m.volume === 24.1)!.size).toBe('tenth');
  });

  it('stays on the burette', () => {
    expect(scaleMarks(-0.3, 0.2)[0].volume).toBe(0);
    expect(scaleMarks(49.8, 50.4).at(-1)!.volume).toBe(50);
  });
});

describe('closeUpWindow', () => {
  it('centres on the reading', () => {
    expect(closeUpWindow(24.37)).toEqual({ from: 23.37, to: 25.37 });
  });

  it('stops at the ends of the scale', () => {
    expect(closeUpWindow(0.2)).toEqual({ from: 0, to: 2 });
    expect(closeUpWindow(49.9)).toEqual({ from: 48, to: 50 });
  });
});
