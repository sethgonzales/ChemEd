# ChemEd

Interactive chemistry simulations for students, styled as an 8-bit dungeon crawler: each simulation is a chamber behind a door on the home page, and Mr. G (a pixel-art chemistry teacher) gives tips and cheers from the corner of the screen on desktop.

Everything works on phones (touch input, narrow screens) and by keyboard.

## Simulations

| Simulation              | Status      | What students do                                                                                                     |
| ----------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------- |
| Periodic Table          | Built       | Pick any element to see its details; colours show each block. Works with arrow keys.                                 |
| States of Matter        | Built       | Heat or cool a substance and watch its particles change phase, with a °C / K readout.                                |
| Lewis Structures        | Built       | Draw structures (atoms, bonds, lone pairs, charges, resonance forms with curved arrows), check them, or take a quiz. |
| Chemical Reactions      | Built       | Balance equations on a balance-beam scale: practice levels, or type your own equation.                               |
| Electron Configurations | Built       | Explore any element's orbitals and Bohr shells, then draw atoms and ions yourself and check them.                    |
| Titrations              | Coming soon | Sealed door on the home page.                                                                                        |

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). To try it on a phone on the same Wi-Fi, run `npm run dev -- -H 0.0.0.0` and open your computer's local IP address on port 3000.

## Commands

| Command            | What it does                                                       |
| ------------------ | ------------------------------------------------------------------ |
| `npm run dev`      | Dev server                                                         |
| `npm test`         | Run the Jest suite once (`npm run test:watch` to re-run on change) |
| `npm run lint`     | ESLint                                                             |
| `npx tsc --noEmit` | Type check                                                         |
| `npm run build`    | Production build. Stop `npm run dev` first: both use `.next/`.     |

## Tech

Next.js 15 (pages router), React 19, TypeScript, Tailwind 4 and Flowbite React. Tests use Jest and React Testing Library. Sounds are made in the browser with the Web Audio API, and the pixel art is drawn as SVG from pixel maps, so there are no image or audio files.

## Project layout

- `src/pages/` — one page per simulation. Page tests live in `src/__tests__/pages/`.
- `src/components/` — shared UI (`Container`, `Stage`, `Tabs`, `Button`, `Dropdown`, `Setting`, Mr. G) and simulation components.
- `src/utils/` — simulation logic as pure, tested functions (physics, chemistry rules, Lewis checking, equation balancing).
- `src/constants/` — element data, molecules, reactions, Mr. G's tips and the pixel art.
- `src/styles/` — themes (Dungeon by default, plus school colour themes).
- `docs/plans/` — the plan behind each feature, with its status and decisions.
- `TODO.md` — what's done and what's next.

Contributors: see [CLAUDE.md](CLAUDE.md) for the test-first workflow, design rules and coding guidelines.

## Licence

[MIT](LICENSE)
