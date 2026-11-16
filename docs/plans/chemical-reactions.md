# Chemical Reactions — plan

Status: **phase 4 done** (16 Nov 2026): Explore, Sort and Predict. The door on the home map stays sealed until phase 5.

Students meet the classic reaction types by seeing what happens to the atoms, then practise telling them apart, and (optionally) predicting what a reaction makes.

## What already exists

- `src/pages/chemical-reactions.tsx`: a placeholder that points to Reaction Balancing.
- `src/utils/reactions.ts`: `parseCompound`, `parseEquation` and `solve` (balancing). Reused here, so every equation on the page is shown balanced.
- Reaction Balancing's practice list, the States of Matter particle canvas, and Mr. G (tips, hints, cheers) to reuse.

## The types (proposed)

The five classic types, recognised from the shape of a balanced equation, so classifying needs no new data:

| Type               | Pattern               | Example                     |
| ------------------ | --------------------- | --------------------------- |
| Synthesis          | A + B → AB            | 2H₂ + O₂ → 2H₂O             |
| Decomposition      | AB → A + B            | 2KClO₃ → 2KCl + 3O₂         |
| Single replacement | A + BC → AC + B       | Zn + CuSO₄ → ZnSO₄ + Cu     |
| Double replacement | AB + CD → AD + CB     | AgNO₃ + NaCl → AgCl + NaNO₃ |
| Combustion         | CₓHᵧ + O₂ → CO₂ + H₂O | CH₄ + 2O₂ → CO₂ + 2H₂O      |

AP Chemistry groups reactions differently (precipitation, acid–base, redox). These overlap with the five (a double replacement may be a precipitation; single replacements and combustions are redox), so the page could tag both.

## Activities (proposed)

1. **Explore**: pick a type, then an example; a particle view shows the atoms as coloured balls regrouping from reactants to products (bonds breaking and forming), with the pattern (A + BC → AC + B) and the balanced equation beside it.
2. **Sort**: Mr. G deals equations; the student names the type of each. Feedback explains the pattern that decides it. Streaks and a running score, like the other practice modes.
3. **Predict** (stretch): given reactants and a type, the student builds the products. Single replacement needs an **activity series** and double replacement needs **solubility rules**, both of which must be sourced and cited before use.

## Engine — `src/utils/reaction-types.ts` (pure, test-first)

- `classify(reaction)`: the type, from the shape (number of reactants and products, which are elements, O₂ + CₓHᵧ(Oz) → CO₂ + H₂O).
- `regroup(reaction)`: which atoms go where, to drive the particle view.
- Tests: every example on the page classifies as its labelled type; edge cases (a synthesis of two compounds, CaO + CO₂ → CaCO₃; a combustion that's also a synthesis-looking shape) decide the way textbooks do.

## Decisions (16 Nov 2026)

1. **All three activities**: Explore, Sort and Predict, as tabs.
2. **The five classic types, tagged with the AP categories** (precipitation, acid–base, redox) where they fit.
3. **Examples come from Reaction Balancing's practice list** (`src/constants/reactions.ts`), which is already grouped by type: level 1 synthesis and decomposition, level 2 combustion, level 3 single and double replacement. Level 4 (redox that fits none of the five) classifies as "other".
4. **Tags from structure, where honest**: _redox_ when an element is free on one side and combined on the other (a sure sign of redox, though not the only one), _acid–base_ when an acid and a metal hydroxide make water. _Precipitation_ needs solubility rules, so it waits for the cited data in phase 4.

## Phases (each test-first)

1. ~~Engine: `classify` and the AP tags, tested against the practice list~~ (done 16 Nov 2026)
2. ~~Explore tab: pick a type and example; the particle view regroups the atoms~~ (done 16 Nov 2026: `src/utils/reaction-particles.ts`, `src/utils/particle-shapes.ts`, `src/components/reaction-particles.tsx`). Polyatomic ions that survive the reaction are one particle; molecules keep their real shapes (bent water, linear CO₂, zigzag chains, the glucose ring); ionic compounds alternate cations and anions.
3. ~~Sort tab: name the type of each equation Mr. G deals~~ (done 16 Nov 2026: `src/components/reaction-sort.tsx`; `explain`, `deal` and `SORT_POOL` in `src/utils/reaction-types.ts`). Score and streak; Mr. G cheers every five in a row.
4. Predict tab: source and cite an activity series and solubility rules, then build the products (and tag precipitations)
   - ~~4a. Data~~ (done 16 Nov 2026, `src/constants/solubility.ts`, `src/utils/solubility.ts`): solubility rules from OpenStax Chemistry 2e Table 4.1; strong acids from Table 4.2 and strong bases from Figure 14.6; the activity series read off the cited E° values already in Electrochemistry (Mg > Al > Zn > Fe > Ni > Pb > H > Cu > Ag), since OpenStax has no activity series of its own.
   - ~~4b. Engine~~ (done 16 Nov 2026, `src/utils/predict.ts`, with the shared `ionsOf` and `compound` in `src/utils/ions.ts`): predicts the products (or no reaction, with the reason) of a single or double replacement, with states, the balanced molecular equation and the net ionic equation with spectators; `check` grades built products (correct, wrong state, wrong products, missed reaction, no reaction). `PREDICT_POOL` holds 139 puzzles: every metal in every other metal's nitrate and in HCl, and pairs of 15 solutions; acids with carbonates are left out, since they give off CO₂, which the engine doesn't model.
   - ~~4c. Tab~~ (done 16 Nov 2026, `src/components/reaction-predict.tsx`; score and streak shared with Sort through `src/components/use-score.ts`): Mr. G deals reactants; students **build the products** from ion chips (formula from the charges), pick each product's state, or answer No reaction. Feedback shows the molecular and net ionic equations and why (decided 16 Nov 2026).
5. Mr. G tips, sources footer, unseal the door
