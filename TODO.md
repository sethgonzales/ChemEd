# TODO

## Integrations

- [ ] **Fork and integrate [Octet-Draw](https://github.com/SamChemMan/Octet-Draw)** — reference for the Lewis Structures simulation.
  - Licence: Apache-2.0, so forking and reusing code is allowed. Keep its `LICENSE`, copyright notices and a NOTICE/attribution for any code we copy, and mark files we change.
  - It's a Tauri desktop app (Vite + React + Indigo WASM), not a drop-in web component; see the Lewis Structures plan before porting.
- [ ] **Fork and integrate [atom-animation](https://github.com/matt765/atom-animation)** — ⚠️ **blocked on permission.**
  - Licence: "Personal Use License" — use and study for personal/educational purposes only; **modification and redistribution are prohibited**. Forking it into ChemEd and deploying it would break that.
  - Next step: ask the author (Mateusz Wyrębek, @matt765) for permission or a more permissive licence. Until then, only use it as inspiration and write our own code.
- [ ] **Set up Firebase** — the project isn't connected to Firebase yet. Decide what it's for (Hosting to put the app online, and/or Auth and Firestore to save students' work), then add the config and deploy.
  - [ ] **Student logins** (Firebase Auth), with each student's progress saved (Firestore).
  - [ ] **8-bit avatar builder** for logged-in students: body/gender, skin tone, eyes, hair, facial features, clothing.
    - Accessories unlock through **achievements** earned in the simulations (balancing reactions, Lewis quizzes, and any future simulation).
    - Signed-out visitors can try the builder first (saved only in their browser); signing in keeps it and starts earning unlocks.
  - [x] **Mr. G, the in-app guide**: an 8-bit Seth (light blue lab coat, goggles) in the bottom corner on desktop, giving tips, hints and encouragement. Doesn't need Firebase. ([plan](docs/plans/mr-g-guide.md))

## Simulations

- [x] Lewis Structures — Draw and Quiz modes; toolbar builder with drag and drop; charge/δ marks and ion brackets; snapping and Clean Up; resonance forms with curved arrows ([plan](docs/plans/lewis-structures-next.md))
- [ ] Electron Configurations
- [ ] Chemical Reactions
- [ ] Titrations
- [x] **Reaction Balancing**, inside Chemical Reactions: practice levels, your own equation, Show answer ([plan](docs/plans/reaction-balancing.md)) — students get an unbalanced equation and type coefficients; a balance-beam scale tips toward the heavier side as they go, and the goal is to make the beam level.
  - Reactants sit in one pan and products in the other, weighted by total mass (coefficient × molar mass).
  - Watch out: equal total mass doesn't guarantee every element balances (two different sets of atoms can weigh the same). Only call it balanced, and show the level beam, when every element's atom count matches; per-element counters next to the scale can show which element is off.
  - Could be its own card or part of Chemical Reactions — decide when we plan it.

## Improvements (from the simulation review)

- [ ] Periodic Table: apply the shared design (`Stage`, `Container` description, colour roles in CLAUDE.md); check the home page cards match too

- [ ] Periodic Table: more colour modes (metal/nonmetal, electronegativity, atomic radius) and search
- [ ] Periodic Table: show synthetic element masses as `[266]` rather than `266.00`
- [ ] Periodic Table: Lu and Lr sit in the f-block row but are coloured d-block blue
- [ ] States of Matter: temperature/kinetic energy readout, heating curve, choice of substance
- [ ] Accessibility: element buttons need `aria-pressed` and arrow-key navigation; white text on yellow p-block cells is low contrast; canvas needs a text alternative and should respect reduced motion
- [ ] Mark placeholder simulations as "Coming soon"
- [ ] Replace the default README
- [ ] Migrate `next lint` (deprecated) to the ESLint CLI
- [x] create a checkbox component that fits the app theme... 
- [x] remove esc as a way to exit simulations... 
- [ ] explore new text theme, make the app feel more like a dungeon crawler sciencey, make the cards more artful and colorful and remove or change sounds to be more like a dungeon. ([plan](docs/plans/dungeon-theme.md))
- [x] mr g avatar needs to have more of a brushed to one side hair style not so symetrical
