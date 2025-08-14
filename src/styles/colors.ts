export const THEME = {
  purple: {
    label: 'Default',
    primary: '#8186e4',
    primaryText: '#ffffff',
    secondary: '#fab87e',
    secondaryText: '#000000',
  },
  black: {
    label: 'Cougar black',
    primary: '#000000',
    primaryText: '#ffffff',
    secondary: '#dc2626',
    secondaryText: '#ffffff',
  },
  brown: {
    label: 'Beaver brown',
    primary: '#dc4405',
    primaryText: '#ffffff',
    secondary: '#000000',
    secondaryText: '#ffffff',
  },
  red: {
    label: 'Raider red',
    primary: '#dc2626',
    primaryText: '#ffffff',
    secondary: '#facc15',
    secondaryText: '#000000',
  },
  'burnt-orange': {
    label: 'Warrior Orange',
    primary: '#c2410c',
    primaryText: '#ffffff',
    secondary: '#ffffff',
    secondaryText: '#000000',
  },
  teal: {
    label: 'Jaguar teal',
    primary: '#14b8a6',
    primaryText: '#ffffff',
    secondary: '#000000',
    secondaryText: '#ffffff',
  },
} as const;

export type ThemeName = keyof typeof THEME;
