# TODO

## Simulations

- [x] **Periodic Table**: the shared design, element details, block colours, arrow-key navigation
- [x] **States of Matter**: heat or cool and watch the particles, with a °C / K readout and a described, reduced-motion-friendly canvas
- [x] **Lewis Structures**: Draw and Quiz modes; toolbar builder with drag and drop; charge/δ marks and ion brackets; snapping and Clean Up; resonance forms with curved arrows ([plan](docs/plans/lewis-structures-next.md))
- [x] **Reaction Balancing** (split out of Chemical Reactions, 13 Nov 2026): practice levels, your own equation, Show answer, and a balance-beam scale that only levels when every element matches ([plan](docs/plans/reaction-balancing.md))
- [x] **Electron Configurations**: Explore (mini periodic table, orbital diagram with drop-in electrons, Bohr shell view, notation, exceptions) and Build (pick an element and charge, tap boxes to draw the diagram, type the notation, Check), with Mr. G's tips, hints and cheers ([plan](docs/plans/electron-configurations.md))
- [x] **Titrations**: Lab (strong, weak and polyprotic acids and bases; three indicators; burette with drops, a stream and fading colour swirls; a stirred flask; a burette close-up for reading the meniscus to 0.01 mL; live pH curve with equivalence and pKa markers) and Unknown (find a hidden concentration, with feedback on endpoint and calculation) ([plan](docs/plans/titrations.md))
- [ ] **Chemical Reactions**: types of chemical reactions (synthesis, decomposition, single and double replacement, combustion, and so on). Sealed on the home page until built; the page points to Reaction Balancing meanwhile.
- [ ] **Ore mining game**: dig down through a 2D cross-section of the Earth's layers with your sprite, finding ores at the depths and settings where they really occur. Each ore you collect earns coins relative to its worth, and a card pops up saying what it's made of, where it's found, what it's used for, and other facts.
- [ ] **Dungeon quest game**: a step-by-step dungeon crawl that strings the quizzes together as levels. Each level opens with a wall of story text setting up a chemistry problem to solve or something to rescue. Each ends with a chemistry-themed boss, beaten by answering a question on a topic from one of the simulations or from general chemistry.
- [x] **Electrochemistry** (16 Nov 2026): Galvanic (mix-and-match half-cells, Connect, voltmeter and bulb, electrodes thinning and plating, the Nernst equation worked, E° table, Predict mode with Mr. G) with a particle lens on each electrode and the salt bridge, and Electrolytic (water, copper plating, molten NaCl, cited minimum voltages, Faraday's law worked) ([plan](docs/plans/electrochemistry.md))

## Improvements

- [x] Periodic Table: more colour modes (metal/nonmetal, electronegativity, atomic radius) and search
- [x] States of Matter: heating curve, choice of substance (water, ethanol, mercury)
  - [x] Solid mercury's heat capacity at its melting point (NIST-JANAF, 28.485 J/(mol·K))
  - [ ] Solid ethanol's heat capacity near 159 K: still borrows the liquid's value. Sources: Haida, Suga & Seki, J. Chem. Thermodyn. 9 (1977) 1133, or Kelley, JACS 51 (1929) 779 (both paywalled) (`src/constants/substances.ts`)
- [ ] Mr. G wears safety goggles over his eyes on wet-lab pages (Titrations, Electrochemistry, and any later ones), to model good lab safety
- [x] Migrate `next lint` (deprecated) to the ESLint CLI
- [x] **Fact sweep and in-app citations** (13 Nov 2026): every value checked against IUPAC, NIST, Cordero et al. or the cited Wikipedia pages; fixes: 19 atomic masses to IUPAC 2024 abridged values (e.g. Zr 91.222, Ar 39.95), Tc [97], Sg [267], Hs [271], Cm electronegativity 1.3, NH₄⁺ pKa 9.25. Sources live in `src/constants/sources.ts` and show in each page’s Sources footer. Was: audit every real-world value the app states (element data, electronegativity, radii, substances, pKa and indicator ranges, E° values, molecule data, constants) and give each a source. Show the sources subtly on each page, e.g. a small "Sources" line at the bottom, so ChemEd models how to represent and cite data. Store a source with each data set in `src/constants/` so the citation can't drift from the value.

## Dungeon look ([plan](docs/plans/dungeon-theme.md))

- [x] Pixel heading font and `PixelFrame` on the shared components
- [x] Home map: chamber doors with their own colours, torchlight hover, sealed doors for unbuilt simulations
- [x] Pixel-art door illustrations
- [x] Dungeon colour theme (the default), with readable text in every theme
- [x] Sounds: a mute button, a "treasure found" sound on successes, and no hover sounds

## Integrations and accounts

- [ ] **Set up Firebase** in the `chemed-app` project. Hosting is live at https://chemed-app.web.app (`npm run deploy`, a static export). Firestore exists (nam5) with locked rules; Auth is still to come. (`chemed-6a31a` is the archived original ChemEd: don't deploy there.)
  - [x] **Hosting**: static export (`output: 'export'`) served from `out/`
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
