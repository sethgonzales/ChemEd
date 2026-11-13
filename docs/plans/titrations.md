# Titrations — plan

Status: **in progress** (12 Nov 2026): phases 1–3 built. See Decisions.

Students add titrant from a burette to a flask of acid or base, one drop or one millilitre at a time, and watch three things change together: the indicator's colour, the pH reading, and a pH curve plotting itself point by point. A second tab hides the analyte's concentration, and students titrate to find it.

## How it works for students

**Lab tab**

1. Pick an **analyte** (what's in the flask) and an **indicator** from dropdowns. The titrant follows from the analyte: NaOH for acids, HCl for bases, both 0.100 M.
2. The flask holds 25.00 mL of analyte at 0.100 M, with the indicator already added.
3. Add titrant with **Add drop** (0.05 mL), **Add 1 mL**, or **Pour**, which runs while it's held down. **Reset** refills the flask and the burette.
4. As titrant goes in:
   - The **flask colour** follows the indicator through its transition range.
   - The **pH meter** reads to two decimal places.
   - The **burette** level drops, read to 0.01 mL.
   - The **pH curve** plots pH against the volume added so far.
5. Settings: **Show pH curve**, and **Mark equivalence points**, which marks each equivalence volume and the half-equivalence point, where pH = pKa.

**Unknown tab**

1. A random analyte from a set list is in the flask, at an unknown concentration between 0.050 and 0.150 M. The pH meter and curve are hidden.
2. Students titrate until the indicator changes colour, then type the concentration they calculate from the burette reading.
3. **Check** marks answers within ±2% as correct, then shows the curve with the student's endpoint and the true equivalence point. That way a poorly chosen indicator shows up as a gap between the two.
4. **New unknown** starts another round.

## Analytes — `src/constants/titrations.ts`

| Analyte | Kind | Constants (25 °C) | What it shows |
|---|---|---|---|
| HCl | strong acid | — | Steep jump; equivalence at pH 7 |
| CH₃COOH (acetic acid) | weak acid | pKa 4.756 | Buffer region; pH = pKa at half-equivalence; equivalence above 7 |
| H₃PO₄ (phosphoric acid) | triprotic acid | pKa 2.14, 7.20, 12.37 | Two visible jumps; the third proton is too weak to show a jump |
| NaOH | strong base | — | The mirror image of HCl, titrated with HCl |
| NH₃ (ammonia) | weak base | pKa(NH₄⁺) 9.24 | Equivalence below 7 |

Indicators, by colour change and transition range (Wikipedia, "pH indicator"):

| Indicator | Low pH | Range | High pH |
|---|---|---|---|
| Methyl orange | red | 3.1–4.4 | yellow |
| Bromothymol blue | yellow | 6.0–7.6 | blue |
| Phenolphthalein | colourless | 8.3–10.0 | pink |

Kw = 1.0 × 10⁻¹⁴ (25 °C). Data tests check these values and that every pKa list ascends.

## Engine — `src/utils/titrations.ts` (pure, test-first)

- `solutionPH(mix)`: pH from the **charge balance** [H⁺] + [Na⁺] = [OH⁻] + [Cl⁻] + Σ(charge of each weak-acid species), solved by bisection on pH. Every case uses the same code: strong, weak, polyprotic, and weak bases (treated as NH₄⁺ with pKa 9.24). No buffer approximations, so it holds at the start, at equivalence, and past it.
- `mixAt(analyte, concentration, titrantVolume)`: the amounts and the dilution after a given volume of titrant.
- `equivalenceVolumes(analyte, concentration)`: one per proton (moles × protons ÷ titrant concentration), flagged when the jump is too small to see.
- `indicatorColor(indicator, pH)`: blends the low and high colours across the transition range. Phenolphthalein's low colour is transparent.
- `curve(analyte, concentration, maxVolume)`: pH at every step, for the reveal and the tests.
- `checkAnswer(answer, actual)`: the ±2% rule.

Behaviour tests rather than constants: HCl's equivalence pH ≈ 7.00; acetic acid at half-equivalence ≈ pKa and at equivalence > 8; NH₃ at equivalence < 6; H₃PO₄ shows two steep jumps; and pH never decreases as base is added.

## UI

- **Layout:** follows `design-cohesion.md`. `Container`, then the Lab/Unknown `Tabs`, then the Analyte and Indicator `Dropdown`s. The `Stage` holds the burette and flask (an SVG) beside the pH curve, as in States of Matter, with the pH and volume readouts in its header. Below it are the buttons, with **Pour** as the accent action, and then the `Setting` checkboxes.
- **Phones:** the burette and flask stack above the curve, and the buttons are big enough to tap. Pour works on touch by holding the button down (pointer events).
- **Keyboard:** Pour also runs while Space or Enter is held down. Each button has an accessible name.
- **Accessibility:** a live text summary such as "pH 4.76 after 12.50 mL, indicator yellow". The flask and curve are `role="img"` with descriptions.
- **Reduced motion:** no falling drop animation; the level and colour update in place.
- **Mr. G:** tips at the first colour change ("That's the endpoint: stop and read the burette!") and at a half-equivalence ("pH = pKa here"). Hints in Unknown mode cover moles = M × L and the mole ratio.
- **Home map:** unseal the Titrations door.

## Phases (each test-first)

1. Constants and engine: pH solver, equivalence volumes, indicator colours, answer check
2. Lab tab: dropdowns, burette controls, flask colour, readouts
3. pH curve and the equivalence markers
4. Unknown tab
5. Mr. G tips, the home door, and sounds (the "treasure" sound on a correct answer)

## Decisions (12 Nov 2026)

1. **Chemistry:** strong and weak acids and bases, plus polyprotic H₃PO₄.
2. **Activities:** a Lab tab, then an Unknown tab.
3. **Indicators:** students choose from methyl orange, bromothymol blue and phenolphthalein.
4. **Defaults** (change if wanted): 25.00 mL of analyte, 0.100 M titrant, a 0.05 mL drop, ±2% tolerance for the Unknown answer, and unknowns between 0.050 and 0.150 M.
5. **Phosphoric acid at 0.050 M** in the Lab (found while building): at 0.100 M its second equivalence point needs 50 mL, a whole burette. At half strength the equivalence points fall at 12.5, 25 and 37.5 mL. Pour runs at 1.5 mL/s.
6. **pH curve** (phase 3): it's calculated, not recorded, so it plots the engine's pH every 0.1 mL up to the volume added. The indicator's range is always shaded on it. "pH = pKa" markers only appear where pH is within 0.1 of the pKa at half-equivalence, which leaves out H₃PO₄'s first and third protons.
