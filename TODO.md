# TODO

## Integrations

- [ ] **Fork and integrate [Octet-Draw](https://github.com/SamChemMan/Octet-Draw)** — reference for the Lewis Structures simulation.
  - Licence: Apache-2.0, so forking and reusing code is allowed. Keep its `LICENSE`, copyright notices and a NOTICE/attribution for any code we copy, and mark files we change.
  - It's a Tauri desktop app (Vite + React + Indigo WASM), not a drop-in web component; see the Lewis Structures plan before porting.
- [ ] **Fork and integrate [atom-animation](https://github.com/matt765/atom-animation)** — ⚠️ **blocked on permission.**
  - Licence: "Personal Use License" — use and study for personal/educational purposes only; **modification and redistribution are prohibited**. Forking it into ChemEd and deploying it would break that.
  - Next step: ask the author (Mateusz Wyrębek, @matt765) for permission or a more permissive licence. Until then, only use it as inspiration and write our own code.

## Simulations

- [ ] Lewis Structures
- [ ] Electron Configurations
- [ ] Chemical Reactions
- [ ] Titrations
- [ ] **Reaction Balancing** — students get an unbalanced equation and type coefficients; a balance-beam scale tips toward the heavier side as they go, and the goal is to make the beam level.
  - Reactants sit in one pan and products in the other, weighted by total mass (coefficient × molar mass).
  - Watch out: equal total mass doesn't guarantee every element balances (two different sets of atoms can weigh the same). Only call it balanced, and show the level beam, when every element's atom count matches; per-element counters next to the scale can show which element is off.
  - Could be its own card or part of Chemical Reactions — decide when we plan it.

## Improvements (from the simulation review)

- [ ] Periodic Table: more colour modes (metal/nonmetal, electronegativity, atomic radius) and search
- [ ] Periodic Table: show synthetic element masses as `[266]` rather than `266.00`
- [ ] Periodic Table: Lu and Lr sit in the f-block row but are coloured d-block blue
- [ ] States of Matter: temperature/kinetic energy readout, heating curve, choice of substance
- [ ] Accessibility: element buttons need `aria-pressed` and arrow-key navigation; white text on yellow p-block cells is low contrast; canvas needs a text alternative and should respect reduced motion
- [ ] Mark placeholder simulations as "Coming soon"
- [ ] Replace the default README
- [ ] Slider: replace the hard-coded `id="range-input"` with `useId()`
- [ ] Migrate `next lint` (deprecated) to the ESLint CLI
