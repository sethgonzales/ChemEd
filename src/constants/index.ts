import type { DoorArtName } from '~/constants/door-art';

type Simulation = {
  title: string;
  path: string;
  art: DoorArtName; // the picture inside its door on the home page
  color: string; // its own colour, like potions on a shelf
  ready: boolean; // unbuilt ones get a sealed door
};

export const SIMULATIONS: Simulation[] = [
  {
    title: 'Periodic Table',
    path: '/periodic-table',
    art: 'periodic',
    color: '#14b8a6', // teal
    ready: true,
  },
  {
    title: 'States of Matter',
    path: '/states-of-matter',
    art: 'states',
    color: '#22c55e', // green
    ready: true,
  },
  {
    title: 'Lewis Structures',
    path: '/lewis-structures',
    art: 'lewis',
    color: '#3b82f6', // blue
    ready: true,
  },
  {
    title: 'Electron Configurations',
    path: '/electron-configurations',
    art: 'electrons',
    color: '#a855f7', // purple
    ready: true,
  },
  {
    title: 'Reaction Balancing',
    path: '/reaction-balancing',
    art: 'balancing',
    color: '#ec4899', // pink
    ready: true,
  },
  {
    title: 'Titrations',
    path: '/titrations',
    art: 'titrations',
    color: '#ef4444', // red
    ready: true,
  },
  {
    title: 'Electrochemistry',
    path: '/electrochemistry',
    art: 'electrochemistry',
    color: '#6366f1', // indigo
    ready: true,
  },
  {
    title: 'Chemical Reactions', // types of reactions, still being built
    path: '/chemical-reactions',
    art: 'reactions',
    color: '#f59e0b', // amber
    ready: false,
  },
];
