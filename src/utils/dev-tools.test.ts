import { devToolsOn } from './dev-tools';

describe('devToolsOn', () => {
  it('is on while developing, without asking', () => {
    expect(devToolsOn({ production: false, flag: undefined })).toBe(true);
  });

  it('is off in a deployed build', () => {
    expect(devToolsOn({ production: true, flag: undefined })).toBe(false);
  });

  it('is on in a deployed build made with NEXT_PUBLIC_DEV_TOOLS=true', () => {
    expect(devToolsOn({ production: true, flag: 'true' })).toBe(true);
  });

  it('takes nothing else as yes', () => {
    expect(devToolsOn({ production: true, flag: 'false' })).toBe(false);
    expect(devToolsOn({ production: true, flag: '' })).toBe(false);
  });
});
