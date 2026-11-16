# Electrochemistry — plan

Status: **phase 1 done** (13 Nov 2026): data and engine. **Phase 2 built** (16 Nov 2026): the Galvanic cell at `/electrochemistry`, not yet on the home map. Decisions below.

Students build cells from two half-cells, close the circuit and watch what happens at three scales: the **bench** (voltmeter, bulb, electrodes thinning or plating), the **particles** (a zoom into an electrode surface where atoms give up electrons and ions move through the solution and salt bridge), and the **numbers** (E°cell, then the Nernst equation as concentrations change).

## How it works for students

**Galvanic tab** (a battery: the reaction drives a current)

1. Pick a metal for each half-cell from dropdowns (e.g. Zn | Zn²⁺ and Cu | Cu²⁺, the Daniell cell, by default).
2. The voltmeter reads 0 until the circuit is closed: **Connect** is the main action. A **salt bridge** checkbox shows why the cell stops without one.
3. Once connected:
   - The **voltmeter** shows E_cell; a small bulb glows in proportion.
   - Electrons flow through the wire from **anode** to **cathode** (dots along the wire); labels mark anode (−, oxidation) and cathode (+, reduction).
   - The anode slowly thins and the cathode grows a coat; the Cu²⁺ solution's blue fades as it's used up.
   - Concentrations change over time, so the voltage falls by the **Nernst equation** until the cell is flat (E = 0, equilibrium).
4. **Zoom**: tap an electrode (or the salt bridge) to open a round lens, like the burette close-up in Titrations, showing the particle view at that spot.
5. Settings: **Show half-equations**, **Show E° table**, **Run faster**.

**Electrolytic tab** (the current drives a reaction)

1. Pick a setup: **copper plating** (Cu electrodes in CuSO₄), **electrolysis of water** (inert electrodes, dilute H₂SO₄; H₂ and O₂ bubble up at 2 : 1), and **molten NaCl** (Na metal and Cl₂ gas).
2. A power supply replaces the voltmeter; nothing happens below the minimum voltage (the decomposition potential), then current flows.
3. A timer and ammeter feed a **Faraday's-law** readout: charge Q = I·t, moles of electrons = Q / F, and the mass plated or volume of gas, so students can check their own calculations.

**Predict mode (stretch)**: Mr. G names two metals; students say which is the anode and the cell voltage, then Connect to check. Feeds the dungeon quest's question bank later.

## Data — `src/constants/electrochemistry.ts`

Standard reduction potentials, 25 °C, 1 M, 1 atm, vs the standard hydrogen electrode, exactly as listed on Wikipedia's "Standard electrode potential (data page)", which credits each row (see decision 5). Every couple is a metal in a nitrate solution of its own ion (decision 6).

| Half-reaction   | E° (V)  | Credited to   |
| --------------- | ------- | ------------- |
| Mg²⁺ + 2e⁻ → Mg | −2.372  | CRC (Vanýsek) |
| Al³⁺ + 3e⁻ → Al | −1.662  | CRC (Lide)    |
| Zn²⁺ + 2e⁻ → Zn | −0.7618 | CRC (Vanýsek) |
| Fe²⁺ + 2e⁻ → Fe | −0.44   | Atkins        |
| Ni²⁺ + 2e⁻ → Ni | −0.257  | CRC (Vanýsek) |
| Pb²⁺ + 2e⁻ → Pb | −0.126  | Atkins        |
| Cu²⁺ + 2e⁻ → Cu | +0.337  | Bard et al.   |
| Ag⁺ + e⁻ → Ag   | +0.7996 | CRC (Vanýsek) |

The water and chlorine couples (2H₂O/H₂, O₂/H₂O, Cl₂/Cl⁻) aren't in the table yet; they arrive with the Electrolytic tab in phase 4, sourced the same way.

Constants: F = 96 485.332 12 C/mol and R = 8.314 462 618 J/(mol·K), exact in the 2019 SI (CODATA 2018). Solution colours (Cu²⁺ blue, Ni²⁺ green, Fe²⁺ pale green, the rest colourless) are approximate and described as such. Each beaker holds 0.1 L, and the bulb and cell together are 10 Ω (model choices, not data).

Molten NaCl will use the Na⁺/Na and Cl₂/Cl⁻ couples as an approximation; the true potentials in the melt differ, and the page will say so.

## Engine — `src/utils/electrochemistry.ts` (pure, test-first)

Built in phase 1:

- `halfCellState(halfCell)`: `ok` (metal in its own ions), `reacts` (the ions take electrons straight from the metal) or `no-own-ions`.
- `electrodePotential(halfCell)`: Nernst for one electrode, E = E° + (RT / nF) ln [Mⁿ⁺].
- `analyzeCell(cell)`: status (`working`, `no-salt-bridge`, `no-difference`, `reacts-in-beaker`, `mismatched`, `flat`), voltage, E°cell, and which side is the anode and which the cathode (the electrode with the higher potential).
- `runCell(cell, seconds)`: drives current through the 10 Ω circuit, using up anode metal and cathode ions, so concentrations and voltage change together; never steps past E = 0.
- `electrolysis(setup, amps, seconds)`: moles of electrons, then mass deposited or gas volume (ideal gas at 25 °C, 1 atm).

Still to build:

- Phase 2: `cellReaction(cell)`: the half-equations, the overall equation, n and the reaction quotient Q for the worked Nernst readout.
- Phase 3: `particles(…)`: the lens's particle model (atoms in the lattice, ions in solution, electrons in the metal), stepped like States of Matter's, with seeded randomness in tests.

Behaviour tests: the Daniell cell reads 1.10 V; swapping the electrodes picks the same anode; Mg | Ag gives the largest voltage on the list; the voltage falls as the cell runs and reaches 0 at equilibrium; no salt bridge → no current; plating 1 A for 965 s deposits ≈ 0.318 g of Cu; electrolysis of water gives twice the volume of H₂ as O₂; in the lens, anions drift towards the anode compartment through the salt bridge and cations towards the cathode.

## UI

- **Layout** (`design-cohesion.md`): `Container`, Galvanic/Electrolytic `Tabs`, metal `Dropdown`s, a `Stage` with the two beakers, wire, meter and salt bridge (SVG) and the particle lens; buttons with **Connect** (or **Power on**) as the accent; then `Setting`s.
- **Reuse:** the beaker and liquid drawing from `titration-apparatus.tsx`; the round lens from `burette-close-up.tsx`; the particle canvas and its stepping from States of Matter; `Slider` for concentrations and voltage.
- **Colour roles:** particles and electrons in `secondary-500` (matter); correct predictions green; errors red as usual.
- **Phones:** beakers side by side but narrower; the lens opens full-width beneath the Stage.
- **Accessibility:** a live summary ("Zn | Cu cell, 1.07 V, zinc is oxidised"); the Stage and lens are `role="img"` with descriptions; electrodes are focusable to open the lens by keyboard.
- **Reduced motion:** no moving electrons or particles; arrows show the flow instead.
- **Mr. G:** "An Ox, Red Cat" (anode oxidation, reduction cathode), why the salt bridge is needed, why the cell runs down.
- **Home map:** a new sealed door (art: two beakers and a lit bulb) while it's built, unsealed at the end.

## Phases (each test-first)

1. ~~Data and engine: E° table, E°cell, Nernst, running the cell down~~ (done 13 Nov 2026)
2. ~~Galvanic tab: half-cell pickers, Connect, voltmeter, electron flow, electrodes changing~~ (built 16 Nov 2026). Notes: concentration sliders step by tens (0.001 to 1 M); simulated time runs at 1 h/s (10 h/s with Run faster), so a Daniell cell goes flat in about 50 s; electrode masses are shown in grams; the voltmeter reads 0 until Connect, as planned (a real voltmeter across an open cell would read E). There is one panel for now; the Galvanic/Electrolytic tabs arrive with phase 4, and the sealed door with its art in phase 5.
3. Particle lens at the anode, cathode and salt bridge
4. Electrolytic tab with Faraday's-law readouts
5. Mr. G tips, sources line, door art, and (if wanted) Predict mode

## Decisions (13 Nov 2026)

1. **Both tabs**: Galvanic and Electrolytic.
2. **Nernst equation included**, at AP / first-year college level: concentration sliders for each half-cell, with E = E° − (RT/nF) ln Q shown worked.
3. **Mix and match**: Zn | Cu (Daniell) is the default, but the point is to swap any metal and any solution in either half-cell and see when a cell works and when it doesn't. A metal in a solution of a different, more easily reduced ion reacts directly in the beaker (e.g. Zn in Cu²⁺ plates copper onto the zinc and gives no useful current); a cell with the same couple on both sides at equal concentrations reads 0 V; without the wire or the salt bridge nothing flows. The engine models each half-cell as an electrode metal plus a solution ion, so mismatches are possible and explained.
4. **Predict mode is built here**, in the Galvanic tab.
5. **E° source** (phase 1): no single primary table was reachable (the CRC chapter is paywalled, and LibreTexts mixes older Bard/Milazzo values such as Cl₂ 1.396 V). Values are taken exactly as listed on Wikipedia's "Standard electrode potential (data page)", which credits each row to the CRC (Vanýsek), Atkins or Bard. So Cu is 0.337 V (Bard) and Fe −0.44 V, and Zn | Cu gives 1.10 V.
6. **Solutions are nitrates**, so every ion stays dissolved (lead and silver sulfates are insoluble). The salt bridge is KNO₃.
7. **Mismatched half-cells** (phase 1): a metal in a more easily reduced metal's ions "reacts in the beaker" (e.g. Zn in Cu²⁺), so no current goes through the wire; a metal in ions it can't displace "has no potential set by E°" (e.g. Cu in Zn²⁺), so the cell is not predictable from the table. Both read 0 V.
8. **Running down** (phase 1): 0.1 L per beaker and 10 Ω in the circuit. A Daniell cell holds most of its voltage until the Cu²⁺ is used up, then goes **flat** (its true equilibrium, at about 10⁻³⁷ M Cu²⁺, is out of reach). A concentration cell runs down smoothly to 0 V as the two sides even out.
9. **Electrolysis minimum voltages** are left for phase 4, once they're sourced.
