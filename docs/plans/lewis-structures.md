# Lewis Structures simulation — plan

Status: **approved** (11 Nov 2026) — see Decisions

## What Octet Draw is

[Octet Draw](https://github.com/SamChemMan/Octet-Draw) (Apache-2.0) is a free ChemDraw replacement for chemists: a desktop app (Tauri + Vite + React + Indigo WASM), about 84k lines. Its editor alone (`src/Editor.tsx`) is 9.5k lines.

**What it has that we want**

- Atom model with charge, radicals and lone pairs (`Atom.pairs`, `radical`, `charge` in `src/render.ts`)
- Lone pairs drawn as dots or as bars (both conventions students meet)
- Automatic lone-pair count from valence electrons (`lonePairs()` in `src/render.ts`)
- Valence and charge checking with plain-English messages (`valences()` and the checker in `src/check.ts`)
- A high-quality SVG renderer, and SMILES/name → structure (Indigo + OPSIN), which already run in a plain browser (its `web/namedemo.ts` website demo)

**What it doesn't have, for teaching Lewis structures**

- Formal charges are never calculated (no code for it)
- No valence-electron budget ("you have 24 electrons, you've used 20")
- No step-by-step guidance or feedback on a student's attempt
- It draws skeletal structures (carbons and hydrogens implied); Lewis structures show every atom and every electron
- No resonance teaching or VSEPR shapes
- Built for keyboard and mouse on a desktop; the editor isn't touch-friendly, and 10 of its files depend on the desktop shell

## Options

| Option                                                         | Effort                                                                      | Fit for students                                     | Phone support |
| -------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------- | ------------- |
| A. Fork and embed Octet's full editor                          | Very high; we'd maintain an 84k-line fork on a different stack (Vite, TS 7) | Poor; a professional tool with ChemDraw's depth      | No            |
| **B. Build our own Lewis builder, port small pieces of Octet** | Medium                                                                      | Designed for it                                      | Yes           |
| C. Link out to Octet Draw                                      | Tiny                                                                        | Students leave ChemEd and must install a desktop app | No            |

**Recommendation: B**, plus an "Open in Octet Draw" export (MOL file) for students who want a professional drawing tool.

We'd port only small, self-contained pieces (valence-electron tables, lone-pair counting, the valence rules) and write the rest ourselves. Apache-2.0 allows this as long as we keep Octet's copyright notice on ported code, add a `NOTICE`/`THIRD_PARTY.md` entry, and mark what we changed.

## Design

### Chemistry core — `src/utils/lewis.ts` (pure functions, test-first)

- `valenceElectrons(symbol)` — from our `ELEMENTS` data (group-based; transition metals out of scope)
- `totalValenceElectrons(formula, charge)` — e.g. NO₃⁻ → 24
- `electronsUsed(structure)` — 2 per bond order + 2 per lone pair (+1 per radical)
- `formalCharge(structure, atom)` — valence − nonbonding electrons − bonds
- `octetStatus(structure, atom)` — complete / incomplete / expanded, with the exceptions taught in school: H and He (duet), Be and B (allowed fewer), period 3+ (expanded octets allowed)
- `checkStructure(structure, molecule)` — a list of feedback items (wrong electron total, atom X has 6 electrons, formal charges could be smaller, etc.), each with a short student-friendly message

### Molecule library — `src/constants/molecules.ts`

About 30 curated molecules in levels, each with its formula, charge, skeleton (atom positions) and accepted answers (including every resonance form):

1. **Basics:** H₂, Cl₂, HCl, H₂O, NH₃, CH₄, HF
2. **Multiple bonds:** O₂, N₂, CO₂, HCN, C₂H₄, CH₂O
3. **Ions and formal charge:** NH₄⁺, OH⁻, CN⁻, CO
4. **Resonance:** O₃, NO₃⁻, CO₃²⁻, SO₂
5. **Exceptions:** BF₃, BeCl₂, NO (radical), PCl₅, SF₆, XeF₄, SO₄²⁻

The data gets its own tests: every answer must pass `checkStructure`, use exactly the right number of electrons, and have formal charges that add up to the ion's charge.

### Builder UI — `src/pages/lewis-structures.tsx` + components

- **SVG, not canvas,** so atoms, bonds and lone pairs are real, accessible, tappable elements
- **Touch-first controls:** tap a bond to cycle single → double → triple → none; tap an atom to add a lone pair, long-press or use a button to remove one. No dragging needed.
- **Electron budget bar:** "18 of 24 valence electrons placed"
- **Live per-atom badges:** electron count (e.g. "8 ✓", "6 !") and formal charge, using icon + text, not colour alone
- **Check button:** runs `checkStructure` and highlights problems
- Reuse `Container`, `Slider`, `cn`, theme colours and the `ELEMENTS` data

### Modes

1. **Free build:** pick a molecule, and the skeleton is given; place bonds and lone pairs, then check
2. **Guided:** the textbook steps, each checked before moving on: count valence electrons → single bonds → lone pairs on outer atoms → leftovers on the central atom → multiple bonds to complete octets → check formal charges
3. **Build the skeleton:** place the atoms and connect them yourself, then add electrons (in scope from the start)

## Phases (each one test-first: failing test → implementation → green)

1. Chemistry core (`lewis.ts`) and its tests
2. Molecule library and data-validation tests
3. Free-build UI with component tests
4. Guided mode
5. Resonance (cycle through valid forms), expanded octets, MOL export / "Open in Octet Draw", attribution files

## Decisions (11 Nov 2026)

1. **Approach:** B. Our own builder; port only small pieces of Octet, with attribution.
2. **Level:** through AP and college: resonance, expanded octets, radicals and formal-charge reasoning are all in scope.
3. **Skeletons:** students can build skeletons themselves, and easier levels can start from a given skeleton.
4. **Lone pairs:** dots by default, with a bars option.
