# TODO

## Simulations

- [x] **Periodic Table**: the shared design, element details, block colours, arrow-key navigation
- [x] **States of Matter**: heat or cool and watch the particles, with a °C / K readout and a described, reduced-motion-friendly canvas
- [x] **Lewis Structures**: Draw and Quiz modes; toolbar builder with drag and drop; charge/δ marks and ion brackets; snapping and Clean Up; resonance forms with curved arrows ([plan](docs/plans/lewis-structures-next.md))
- [x] **Chemical Reactions**, currently the Reaction Balancing activity: practice levels, your own equation, Show answer, and a balance-beam scale that only levels when every element matches ([plan](docs/plans/reaction-balancing.md))
- [ ] **Electron Configurations**: Explore built (mini periodic table, orbital diagram with drop-in electrons, Bohr shell view, notation, exceptions) and Build (tap boxes to draw the diagram, type the notation, Check; pick the element on the periodic table before or after drawing); Mr. G hints and ions to come ([plan](docs/plans/electron-configurations.md))
- [ ] **Titrations** (sealed "Coming soon" door for now)
- [ ] **Ore mining game**: dig down through a 2D cross-section of the Earth's layers with your sprite, finding ores at the depths and settings where they really occur. Each ore you collect earns coins relative to its worth, and a card pops up saying what it's made of, where it's found, what it's used for, and other facts.
- [ ] **Electrochemistry**: interactive animations of different kinds of cells to test, with zoom into particle representations of how atoms and electrons move during the redox reaction inside each cell

## Improvements

- [ ] Periodic Table: more colour modes (metal/nonmetal, electronegativity, atomic radius) and search
- [ ] States of Matter: heating curve, choice of substance
- [ ] Chemical Reactions: more activities beside balancing (e.g. reaction types), as tabs
- [ ] Migrate `next lint` (deprecated) to the ESLint CLI

## Dungeon look ([plan](docs/plans/dungeon-theme.md))

- [x] Pixel heading font and `PixelFrame` on the shared components
- [x] Home map: chamber doors with their own colours, torchlight hover, sealed doors for unbuilt simulations
- [x] Pixel-art door illustrations
- [x] Dungeon colour theme (the default), with readable text in every theme
- [x] Sounds: a mute button, a "treasure found" sound on successes, and no hover sounds

## Integrations and accounts

- [ ] **Set up Firebase**. Decide what it's for (Hosting to put the app online, and/or Auth and Firestore to save students' work), then add the config and deploy.
  - [ ] **Student logins** (Firebase Auth), with each student's progress saved (Firestore).
  - [ ] **8-bit avatar builder** for logged-in students: body/gender, skin tone, eyes, hair, facial features, clothing.
    - Accessories unlock through **achievements** earned in the simulations (balancing reactions, Lewis quizzes, and any future simulation).
    - Signed-out visitors can try the builder first (saved only in their browser); signing in keeps it and starts earning unlocks.
- [ ] **[atom-animation](https://github.com/matt765/atom-animation)**: ⚠️ **blocked on permission.**
  - Licence: "Personal Use License" — use and study for personal/educational purposes only; **modification and redistribution are prohibited**. Forking it into ChemEd and deploying it would break that.
  - Next step: ask the author (Mateusz Wyrębek, @matt765) for permission or a more permissive licence. Until then, only use it as inspiration and write our own code.

## Done

- [x] **Mr. G, the in-app guide**: an 8-bit Seth (light blue lab coat, goggles, hair brushed to one side) in the bottom corner on desktop, giving tips, hints and encouragement ([plan](docs/plans/mr-g-guide.md))
- [x] **[Octet-Draw](https://github.com/SamChemMan/Octet-Draw)** as the reference for Lewis Structures. We wrote our own code rather than forking it, so no Apache-2.0 notices are needed; "Open in Octet Draw" was dropped.
- [x] Shared design across simulations: `Container`, `Stage`, `Tabs`, `Button`, `Dropdown`, `Setting` and the colour roles in CLAUDE.md ([plan](docs/plans/design-cohesion.md))
- [x] Themed checkbox component (`Setting`)
- [x] Esc no longer exits simulations
- [x] Periodic Table data fixes: synthetic masses as `[266]`; La/Ac in group 3 with Lu/Lr in the f-block
- [x] Accessibility: arrow keys and `aria-pressed` on the Periodic Table, readable block colours, a described States of Matter canvas
- [x] Replace the default README
