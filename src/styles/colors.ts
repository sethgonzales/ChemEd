export const THEME = {
  purple: {
    primary: '#8186e4',
    primaryText: '#ffffff',
    secondary: '#fab87e',
    secondaryText: '#000000',
  },
  black: {
    primary: '#000000',
    primaryText: '#ffffff',
    secondary: '#dc2626',
    secondaryText: '#ffffff',
  },
  teal: {
    primary: '#14b8a6',
    primaryText: '#ffffff',
    secondary: '#000000',
    secondaryText: '#ffffff',
  },
  red: {
    primary: '#dc2626',
    primaryText: '#ffffff',
    secondary: '#facc15',
    secondaryText: '#000000',
  },
  'burnt-orange': {
    primary: '#c2410c',
    primaryText: '#ffffff',
    secondary: '#ffffff',
    secondaryText: '#000000',
  },
} as const;

export type ThemeName = keyof typeof THEME;
