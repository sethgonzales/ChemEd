// Periodic table colours: solid, so white text on them stays readable
export const BLOCK_COLORS: Record<'s' | 'p' | 'd' | 'f', string> = {
  s: '#dc2626', // red
  p: '#b45309', // amber
  d: '#2563eb', // blue
  f: '#15803d', // green
};

export const CATEGORY_COLORS: Record<
  'metal' | 'metalloid' | 'nonmetal',
  string
> = {
  metal: '#2563eb', // blue
  metalloid: '#7c3aed', // violet
  nonmetal: '#15803d', // green
};

// low → middle → high on a trend (electronegativity, radius), all dark enough
export const TREND_STOPS = ['#1e40af', '#7e22ce', '#be123c'];

// elements with no value for the current colour mode
export const NO_DATA_COLOR = '#4b5563';
