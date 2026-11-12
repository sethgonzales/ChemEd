# Electron Configurations — plan

Status: **in progress** (12 Nov 2026): phases 1–5 built, see Decisions

Students see how electrons fill an atom's orbitals, then fill them in themselves. The page opens the sealed Electron Configurations door on the home map.

## How it works for students

Two modes, as `Tabs`:

### Explore

1. Pick any of the 118 elements on a **small periodic table**, coloured by block so students link s, p, d and f to where the element sits, or step through with **◀ Previous** and **Next ▶**. The table reuses the Periodic Table page's grid (`gridPosition`, arrow keys), shrunk to symbols only.
2. The **Stage** shows the **orbital diagram**: one box per orbital (1 for s, 3 for p, 5 for d, 7 for f), stacked by energy, lowest at the bottom, so the Aufbau order (1s, 2s, 2p, 3s, 3p, 4s, 3d, …) reads bottom to top. Electrons are arrows (↑ and ↓) in the accent colour, because they're matter.
3. Stepping to the next element **drops in the new electron**: it falls into its box, so students see Hund's rule (one per box before pairing) happen. With reduced motion it simply appears.
4. Readouts inside the Stage:
   - full notation: 1s² 2s² 2p⁶ 3s¹
   - noble-gas shorthand: [Ne] 3s¹
   - valence electrons, and the block (s, p, d, f), coloured like the Periodic Table
5. **Exceptions** (Cr, Cu, Mo, Ag, Au, …) get a short note: "Chromium is an exception: a half-filled 3d is more stable, so it's [Ar] 3d⁵ 4s¹, not 3d⁴ 4s²." The note shows the Aufbau prediction next to the real configuration (this replaced a planned "Show Aufbau prediction" switch, which added nothing for the other elements).
6. **Orbitals / Shells** view switch: the **Bohr shell view** draws the nucleus with electrons on rings by n (2, 8, 18, …), next to the same notation. New electrons drop onto their ring just as they do into boxes.

### Build (practice)

1. Pick a level and an element, like the Reaction Balancing dropdowns:
   1. **H to Ne:** 1s, 2s, 2p
   2. **Na to Ar:** adds 3s, 3p
   3. **K to Kr:** 4s before 3d
   4. **Exceptions and ions:** Cr, Cu, Na⁺, Cl⁻, Fe²⁺, Cu²⁺, …
2. The diagram starts empty. Students pick a tool, **↑**, **↓** or **Erase**, then tap boxes: ↑ and ↓ add that arrow (up to two per box), Erase removes the last one. Every mistake is possible on purpose (↑↑ in a box, ↓ first, opposite singles), so Check can explain it. Tools and boxes are buttons, so it all works by keyboard.
3. Students also type the notation (e.g. `1s2 2s2 2p4`). It shows with superscripts as they type.
4. **Check** names the rule that's broken, on the box that breaks it:
   - **Count:** "Oxygen has 8 electrons; you've placed 7."
   - **Aufbau:** "3d is filling before 4s is full."
   - **Pauli:** "Two electrons in one box must spin opposite ways (↑↓)."
   - **Hund:** "In 2p, put one electron in each box before pairing," and "Single electrons in a subshell spin the same way."
   - **Notation:** "Your notation says 2p³, but the diagram has 2p⁴."
5. When it's right: Mr. G cheers and the treasure sound plays. **Show answer** fills it in, as in Balancing.

## Engine — `src/utils/electron-configurations.ts` (pure, test-first)

- `SUBSHELL_ORDER`: built from the Madelung (n + l) rule rather than typed out, with a test that it starts 1s, 2s, 2p, 3s, 3p, 4s, 3d, 4p.
- `parseConfiguration('[Ar] 3d5 4s1')`: expands the shorthand into subshell counts. It also reads students' typing (`1s2 2s2`, with or without spaces or superscripts).
- `formatConfiguration(counts, { shorthand })`: full or noble-gas notation, with superscripts.
- `aufbauConfiguration(z)`: the configuration the filling rules predict. `isException(z)` compares it with our element data.
- `orbitalDiagram(counts)`: the arrows in each box, following Hund (parallel singles first, then pairs).
- `checkDiagram(target, boxes, typed)`: the list of problems above, each naming the subshell or box it's about.
- `ionConfiguration(z, charge)`: electrons leave the highest n first, so Fe²⁺ is [Ar] 3d⁶ and not [Ar] 3d⁴ 4s².
- `valenceElectrons(z)`.

Data: every element already has a ground-state `electronConfiguration` (including exceptions like Cr and Cu) in `src/constants/elements.ts`. A data test will check that each one has the right electron total and that every place it differs from `aufbauConfiguration` is a known exception. Mr. G's tips for the page go in `src/constants/guide-tips.ts`.

## UI

- `Container` with the title and one line: "See how electrons fill an atom's orbitals, then fill them in yourself."
- `Tabs` (Explore, Build), then `Dropdown`s, then the `Stage` with the diagram and readouts, then one row of `Button`s (◀ Previous / Next ▶, or Check (main) / Show answer / Clear). In Explore, the mini periodic table is the picker.
- Phones: rows of boxes wrap. Elements up to Kr fit without wrapping at 390 px; f-block rows (7 boxes) wrap under their label. No sideways scroll.
- New components: `OrbitalDiagram` (boxes, arrows, drop-in animation, tools), `ShellDiagram` (Bohr rings) and `MiniPeriodicTable` (the picker). The Periodic Table page then uses the shared `formatConfiguration` instead of its own superscript formatter. The page stays a thin wrapper.

## Phases (each test-first)

1. **Engine** (done): order, parse, format, Aufbau prediction, exceptions, Hund diagram, ions, plus the data test over all 118 elements.
2. **Explore** (done): page shell, mini periodic table picker, `OrbitalDiagram` (read-only), readouts, Previous/Next, unseal the door.
3. **Drop-in animation** (done): on Next only, so picking from the table jumps straight there; reduced motion just shows it.
4. **Shell view** (done): `ShellDiagram` and Orbitals / Shells tabs above the diagram; the drawing fits its shells (at least four), so heavy atoms fill it too.
5. **Build** (done): ↑ / ↓ / Erase tools, typed notation, `checkDiagram` (count, Aufbau, Pauli, Hund, notation), Check / Show answer, levels 1–3.
6. **Mr. G:** page tips, hints for Build, cheers with the treasure sound.
7. **Ions and exceptions level** (level 4).

## Decisions (12 Nov 2026)

1. **Ions:** yes, as Build level 4 with the exceptions (Na⁺, Cl⁻, Fe²⁺, Cu²⁺, …).
2. **Picking elements:** a small periodic table, coloured by block, plus Previous/Next.
3. **Explore range:** the full table, all 118 elements; diagram rows wrap on phones.
4. **Bohr shell view:** yes, as a second view in Explore.
5. **Mistakes allowed:** ↑ / ↓ / Erase tools instead of a fixed cycle, so students can break Pauli and Hund and be told why.
