// What Mr. G says on each page. The first tip is his welcome; clicking him cycles through the rest.

export const PAGE_TIPS: Record<string, string[]> = {
  '/': [
    "Pick a simulation to get started. I'll meet you there with tips.",
    'Not sure where to start? States of Matter is a good warm-up.',
    'Change the colours with the theme picker in the top-right corner.',
  ],
  '/periodic-table': [
    'Click any element to see its details, like atomic mass and electron configuration.',
    'The colours show each element’s block: s, p, d or f.',
    'Main-group elements in the same column have the same number of valence electrons, so they behave alike.',
  ],
  '/states-of-matter': [
    'Drag the temperature slider and watch the particles speed up or slow down.',
    'In a solid, particles vibrate in place. In a liquid, they slide past each other. In a gas, they fly apart.',
    'Watch the phase badge near the melting and boiling points. That’s where the phase changes.',
    'Temperature is shown in °C and in kelvin. At 0 K, absolute zero, the particles barely move.',
  ],
  '/lewis-structures': [
    "Pick a tool, then click the drawing. Your cursor shows what you'll place.",
    'Count the valence electrons first. The counter at the top tracks how many you’ve placed.',
    'Most atoms want 8 electrons around them. Hydrogen only wants 2.',
    'Press Check your work when you’re done, then hover over any flagged atom to see what’s wrong.',
    'Made a mistake? Ctrl+Z undoes it, and Ctrl+Y redoes it.',
    'Switch to Quiz to practise real molecules and get them graded.',
  ],
  '/chemical-reactions': [
    'Use + and − to change the coefficients, or type a number. Never change the formulas themselves.',
    'The seesaw tips toward the side with more atoms. Match every element and it levels out.',
    'Start with an element that’s in only one molecule on each side. Save H and O for last.',
    'Use the smallest whole numbers you can: 2 H₂ + O₂, not 4 H₂ + 2 O₂.',
    'Try Your own equation to balance any reaction you type in.',
  ],
};

/** For pages without their own tips */
export const GENERAL_TIPS = [
  'This simulation is still being built. Check back soon!',
  'Click me any time for a tip.',
];
