import { act, render, renderHook, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from './theme-provider';

function ShowTheme() {
  const { themeName, setThemeName } = useTheme();
  return <button onClick={() => setThemeName('teal')}>{themeName}</button>;
}

const rootVar = (name: string) =>
  document.documentElement.style.getPropertyValue(name);

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('style');
});

describe('ThemeProvider', () => {
  it('defaults to the purple theme and applies its colours', () => {
    render(
      <ThemeProvider>
        <ShowTheme />
      </ThemeProvider>,
    );
    expect(screen.getByRole('button')).toHaveTextContent('purple');
    expect(rootVar('--primary')).toBe('#8186e4');
    expect(rootVar('--secondary')).toBe('#fab87e');
  });

  it('restores a saved theme from localStorage', () => {
    localStorage.setItem('chem.theme', 'red');
    render(
      <ThemeProvider>
        <ShowTheme />
      </ThemeProvider>,
    );
    expect(screen.getByRole('button')).toHaveTextContent('red');
    expect(rootVar('--primary')).toBe('#dc2626');
  });

  it('ignores an unknown saved theme', () => {
    localStorage.setItem('chem.theme', 'not-a-theme');
    render(
      <ThemeProvider>
        <ShowTheme />
      </ThemeProvider>,
    );
    expect(screen.getByRole('button')).toHaveTextContent('purple');
  });

  it('applies and saves a newly selected theme', () => {
    render(
      <ThemeProvider>
        <ShowTheme />
      </ThemeProvider>,
    );
    act(() => screen.getByRole('button').click());
    expect(screen.getByRole('button')).toHaveTextContent('teal');
    expect(rootVar('--primary')).toBe('#14b8a6');
    expect(localStorage.getItem('chem.theme')).toBe('teal');
  });
});

describe('useTheme', () => {
  it('throws outside a ThemeProvider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useTheme())).toThrow(
      'useTheme must be used within ThemeProvider',
    );
  });
});
