// The Dungeon Quest's chambers, in the dungeon's topic order. Each one is a
// simulation's topic: Mr. G's story, a door for each room, and its boss.

import type { VillainArt } from '~/components/villain';
import { DJINN } from '~/constants/villains/djinn';
import { GOLEM } from '~/constants/villains/golem';
import { HYDRA } from '~/constants/villains/hydra';
import { LICH } from '~/constants/villains/lich';
import { SLIME } from '~/constants/villains/slime';
import { SPHINX } from '~/constants/villains/sphinx';
import { WEAVER } from '~/constants/villains/weaver';
import { WRAITH } from '~/constants/villains/wraith';
import { WYRM } from '~/constants/villains/wyrm';
import type { Chamber, QuickQuestion } from '~/utils/quest';
import { QUESTION_SOURCES } from '~/utils/quest-sources';

export interface QuestChamber extends Chamber<QuickQuestion> {
  topic: string; // the simulation it comes from
  page: string; // that simulation's page, whose question source it asks from
  villain: VillainArt;
  story: string[]; // Mr. G's lines on the story wall
  doors: { name: string; story: string }[]; // one for each room
  // rooms borrowed from other chambers (the Alchemist's trials), by chamber
  // id and which of its rooms
  trials?: { id: string; room: number }[];
}

// the boss asks its simulation's questions, at that source's levels
const asks = (page: string) => ({
  page,
  courses: QUESTION_SOURCES[page].levels,
  bossQuestion: QUESTION_SOURCES[page].question,
});

export const CHAMBERS: QuestChamber[] = [
  {
    id: 'periodic',
    topic: 'Periodic Table',
    villain: SPHINX,
    story: [
      'The Element Sphinx guards the first chamber. Its headdress is made of element tiles, and one always glows as it thinks.',
      'It speaks only in riddles. Each of its doors opens for the one element that fits.',
      'Answer two riddles, then beat the Sphinx at its own questions. Ready?',
    ],
    rooms: 2,
    doors: [
      {
        name: 'The riddle door',
        story:
          'A door of stone tiles, one for every element. The Sphinx’s voice asks a riddle, and only the right tile opens it.',
      },
      {
        name: 'The Sphinx’s gate',
        story:
          'At its gate, the Sphinx asks about a trend: which element in a row pulls hardest on shared electrons.',
      },
    ],
    bossHp: 5,
    ...asks('/periodic-table'),
  },
  {
    id: 'electrons',
    topic: 'Electron Configurations',
    villain: LICH,
    story: [
      'Below the Sphinx’s hall lies the crypt of the Orbital Lich. Orbitals circle it, and it hoards electrons.',
      'Its doors open only for an atom drawn right: every electron in its box, filled in order, one per box before any pair.',
      'Draw your way through two doors, then answer the Lich’s questions to break its hold. Ready?',
    ],
    rooms: 2,
    doors: [
      {
        name: 'The crypt door',
        story:
          'Rows of empty orbital boxes are carved into the door. Fill them for the atom named above it, and write its notation.',
      },
      {
        name: 'The Lich’s vault',
        story:
          'The vault door asks for one more configuration. Draw it right and the door swings open.',
      },
    ],
    bossHp: 5,
    ...asks('/electron-configurations'),
  },
  {
    id: 'lewis',
    topic: 'Lewis Structures',
    villain: WEAVER,
    story: [
      'Webs hang across this chamber, spun by the Bond Weaver. Its threads are bonds, and lone pairs cling to them like dew.',
      'Its doors are tangled in molecules waiting to be drawn. Draw each one, every bond and lone pair in place, to cut through.',
      'Get past two doors, then answer the Weaver’s questions to bring it down. Ready?',
    ],
    rooms: 2,
    doors: [
      {
        name: 'The tangled door',
        story:
          'A molecule’s name is carved into the door. Draw its whole Lewis structure: every atom, bond and lone pair.',
      },
      {
        name: 'The Weaver’s web',
        story:
          'The last web holds one more molecule. Find its best Lewis structure and the web gives way.',
      },
    ],
    bossHp: 5,
    ...asks('/lewis-structures'),
  },
  {
    id: 'states',
    topic: 'States of Matter',
    villain: WYRM,
    story: [
      'The air turns bitter cold. Frost creeps over the stones: you’ve woken the Frost Wyrm.',
      'It has frozen its doors shut, and each asks about the states of matter: what the particles show, what the heating curve says, and how solids, liquids and gases differ.',
      'Get past three doors, then answer the Wyrm’s questions to melt its hold on the dungeon. Ready?',
    ],
    rooms: 3,
    doors: [
      {
        name: 'The frozen door',
        story:
          'Particles drift and jostle inside the ice. Watch how they move and name their state.',
      },
      {
        name: 'The frost-scratched door',
        story:
          'A heating curve is scratched into the frost, its segments lettered. Read it to answer the door.',
      },
      {
        name: 'The Wyrm’s lair',
        story:
          'The last door asks what sets solids, liquids and gases apart. Answer, and the ice gives way.',
      },
    ],
    bossHp: 5,
    ...asks('/states-of-matter'),
  },
  {
    id: 'balancing',
    topic: 'Reaction Balancing',
    villain: GOLEM,
    story: [
      'This chamber belongs to the Unbalanced Golem, a heap of atoms that can’t stand a balanced equation.',
      'Its doors are sealed with equations. Each one opens when every element has the same number of atoms on both sides.',
      'Get through two doors, then answer the Golem’s questions to bring it down. Ready?',
    ],
    rooms: 2,
    doors: [
      {
        name: 'The bridge',
        story:
          'A rope bridge hangs over the acid moat. It only holds once its equation balances.',
      },
      {
        name: 'The door seal',
        story:
          'The Golem’s door is sealed with an equation. Balance it to break the seal.',
      },
    ],
    bossHp: 5,
    ...asks('/reaction-balancing'),
  },
  {
    id: 'reactions',
    topic: 'Chemical Reactions',
    villain: SLIME,
    story: [
      'Something squelches in the dark. A clear ooze slides out, with a yellow solid forming inside it: the Precipitate Slime.',
      'It guards its doors with pairs of reactants. Say what they make, and in what state, or that they don’t react at all.',
      'Predict your way through two doors, then answer the Slime’s questions to dry it up. Ready?',
    ],
    rooms: 2,
    doors: [
      {
        name: 'The bubbling door',
        story:
          'Two reactants drip onto the door. Write the products they make, with their states. A wrong guess brings a new pair.',
      },
      {
        name: 'The Slime’s pool',
        story:
          'One more pair to predict. This one might not react at all, so think before you write.',
      },
    ],
    bossHp: 5,
    ...asks('/chemical-reactions'),
  },
  {
    id: 'gases',
    topic: 'Gas Laws',
    villain: DJINN,
    story: [
      'A flask lies on its side in the dark, its cork popped. Something violet curls out of the neck and swells into a shape: the Pressure Djinn.',
      'It fills whatever room it’s given, and it seals its doors with gases under pressure. Each one opens when you work out how the gas will change.',
      'Get through two doors, then answer the Djinn’s questions to squeeze it back into its flask. Ready?',
    ],
    rooms: 2,
    doors: [
      {
        name: 'The piston door',
        story:
          'A piston holds this door shut. One quantity of its gas changes while others stay fixed. Work out the one that’s missing.',
      },
      {
        name: 'The Djinn’s flask',
        story:
          'This time more than one thing changes at once, or there’s only the gas itself to go on. Find the value that opens it.',
      },
    ],
    bossHp: 5,
    ...asks('/balloon-riser'),
  },
  {
    id: 'titrations',
    topic: 'Titrations',
    villain: HYDRA,
    story: [
      'Acid fumes sting your eyes. Three heads rise from the dark, each one a flask: the Acid Hydra.',
      'Its doors hold flasks of unknown concentration, already titrated. Read each curve and work out how strong it is.',
      'Get past two doors, then answer the Hydra’s questions to neutralise it. Ready?',
    ],
    rooms: 2,
    doors: [
      {
        name: 'The burette door',
        story:
          'A flask of unknown concentration has been titrated to its equivalence point. From the data and the curve, calculate its concentration.',
      },
      {
        name: 'The Hydra’s den',
        story:
          'One more unknown guards the den. Moles of titrant at the equivalence point, then divide by the flask’s volume.',
      },
    ],
    bossHp: 5,
    ...asks('/titrations'),
  },
  {
    id: 'electrochemistry',
    topic: 'Electrochemistry',
    villain: WRAITH,
    story: [
      'The air hums and crackles. Between two metal pillars floats the Voltaic Wraith, wrapped in sparks.',
      'Its doors are cells of two metals. Name the anode and predict the voltage before the current is let loose.',
      'Get through two doors, then answer the Wraith’s questions to break its circuit. Ready?',
    ],
    rooms: 2,
    doors: [
      {
        name: 'The humming door',
        story:
          'Two half-cells are wired into the door. Use the table of reduction potentials to name the anode and predict the voltage.',
      },
      {
        name: 'The Wraith’s circuit',
        story:
          'One last cell holds the Wraith’s circuit. Get its anode and voltage right to close it.',
      },
    ],
    bossHp: 5,
    ...asks('/electrochemistry'),
  },
];

export const CHAMBER_IDS = CHAMBERS.map((c) => c.id);

export const findChamber = (id: string) => CHAMBERS.find((c) => c.id === id);
