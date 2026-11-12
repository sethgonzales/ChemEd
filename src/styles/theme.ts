export const THEME = {
  dungeon: {
    label: 'Dungeon',
    primary: '#52525b', // stone gray
    primaryText: '#ffffff',
    secondary: '#84cc16', // glowing ooze
    secondaryText: '#000000',
  },
  purple: {
    label: 'Classic',
    primary: '#6168dd', // darkened from #8186e4 so white text is readable
    primaryText: '#ffffff',
    secondary: '#fab87e',
    secondaryText: '#000000',
  },
  black: {
    label: 'Cougars',
    primary: '#000000',
    primaryText: '#ffffff',
    secondary: '#dc2626',
    secondaryText: '#ffffff',
  },
  brown: {
    label: 'Beavers',
    primary: '#d24105', // darkened from #dc4405 so white text is readable
    primaryText: '#ffffff',
    secondary: '#000000',
    secondaryText: '#ffffff',
  },
  red: {
    label: 'Raiders',
    primary: '#dc2626',
    primaryText: '#ffffff',
    secondary: '#facc15',
    secondaryText: '#000000',
  },
  'burnt-orange': {
    label: 'Warriors',
    primary: '#c2410c',
    primaryText: '#ffffff',
    secondary: '#000000',
    secondaryText: '#ffffff', // black on black was unreadable
  },
  teal: {
    label: 'Jaguars',
    primary: '#0e8376', // darkened from #14b8a6 so white text is readable
    primaryText: '#ffffff',
    secondary: '#000000',
    secondaryText: '#ffffff',
  },
} as const;

export type ThemeName = keyof typeof THEME;
