# Reaction Balancing — plan

Status: **done** (11 Nov 2026): phases 1–6 built. See Decisions.

Students get an unbalanced equation and type coefficients. A balance scale shows reactants in one pan and products in the other, and the beam tips toward the heavier side as they work. The goal is to level the beam.

## How it works for students

1. Pick a level and a reaction from the same dropdowns as Lewis Structures.
2. The equation shows with a coefficient box before each formula, e.g. `[ ] CH₄ + [ ] O₂ → [ ] CO₂ + [ ] H₂O`. Each box has − and + buttons, and you can type in it as well. Coefficients start at 1.
3. As coefficients change:
   - **The scale** tips toward the heavier side. Each pan shows its total mass (coefficient × molar mass, e.g. "Reactants 80.0 g/mol"), and the tilt grows with the difference, up to a limit.
   - **An atom tally** lists each element with its count on each side and a ✓ or ✗, e.g. "H: 4 → 2 ✗". This is what students actually balance against.
4. **Balanced** means every element matches. The beam then sits level and a "Balanced!" message appears.
   - Balanced but not in lowest terms (4H₂ + 2O₂ → 4H₂O): "Balanced! Can you use smaller whole numbers?"
   - If the masses match but the atoms don't, which is rare but possible, the beam stays level and the message says so, pointing to the tally.

## Why mass _and_ atoms

The scale makes conservation of mass visible: a balanced equation has equal mass on both sides. But equal mass alone doesn't prove the equation is balanced, so the verdict always comes from the atom tally, and the scale is the motivation.

## Engine — `src/utils/reactions.ts` (pure, test-first)

- `parseCompound('Ca3(PO4)2')`: element counts, including nested parentheses. The Lewis parser can't do brackets, so this is new.
- `atomTotals(side, coefficients)` and `elementTally(reaction, coefficients)`: per-element counts for each side.
- `molarMass(formula)`, from our element data's atomic masses, and `sideMass(...)`.
- `isBalanced(...)` and `isLowestTerms(...)`, which checks that the coefficients' GCD is 1.
- `solve(reaction)`: finds the smallest whole-number coefficients. It's used to verify every reaction in the library, and it could later power a "Show answer".
- `beamAngle(left, right)`: tilt from the mass difference, clamped to ±20°.

## Reaction library — `src/constants/reactions.ts`

About 25 reactions over four levels:

1. **Simple synthesis and decomposition:** H₂ + O₂ → H₂O, N₂ + H₂ → NH₃, Na + Cl₂ → NaCl, Mg + O₂ → MgO, H₂O₂ → H₂O + O₂
2. **Combustion:** CH₄, C₂H₆, C₃H₈ and C₂H₅OH burning in O₂
3. **Polyatomic ions and double replacement:** AgNO₃ + NaCl, Ca(OH)₂ + H₃PO₄ → Ca₃(PO₄)₂ + H₂O, Al + CuSO₄, Pb(NO₃)₂ + KI
4. **College redox:** Cu + HNO₃ → Cu(NO₃)₂ + NO + H₂O, KMnO₄ + HCl → KCl + MnCl₂ + Cl₂ + H₂O

Data tests check that every reaction can be balanced, that the stored answer is the smallest whole-number solution (cross-checked against `solve`), and that every element appears on both sides.

## UI

- **Page layout:** equation on top, then the scale, then the atom tally. On phones the equation wraps and the scale scales down.
- **Scale:** an SVG beam on a pivot, with a pan hanging from each end that stays level as the beam turns. It tips smoothly, or instantly with reduced motion.
- **Pickers:** the existing `Dropdown`, the same as Lewis Quiz mode.
- **Accessibility:** a live text summary describes the tilt, e.g. "Scale tips toward the products, 36.0 vs 32.0 g/mol". The steppers have labels such as "Coefficient for O₂". Everything works by keyboard.

## Phases (each test-first)

1. Engine: parser, tallies, masses, balance checks, solver, beam angle
2. Reaction library and data-validation tests
3. Equation with coefficient steppers, the atom tally and the Balanced message
4. Balance scale animation
5. Wire it into the site (see decision 1)

## Decisions (11 Nov 2026)

1. **Where:** inside the **Chemical Reactions** page as its first activity. Types of chemical reactions get added there later.
2. **Lowest terms:** a balanced equation that isn't in lowest terms counts as balanced, with a nudge toward the smallest whole-number ratio.
3. **Free mode:** yes. Students can type their own equation to balance (phase 6).
4. **Show answer:** yes, using the solver.
5. **Seesaw, not mass scale** (changed after building): the scale showed g/mol, but the lesson is about counting atoms. It's now a seesaw holding one chip per molecule that tips toward the side with more atoms and levels when every element matches. The atom count table sits underneath. Molar-mass code was removed.

## Phases (updated)

6. Free mode: type an equation (`CH4 + O2 -> CO2 + H2O`) and balance it with the same scale and tally
