# Lewis Structures — next features

Status: **A and B done; D next; C dropped** (11 Nov 2026). Follows [lewis-structures.md](lewis-structures.md) (phases 1–3 done).

Four features inspired by [Octet Draw](https://github.com/SamChemMan/Octet-Draw). Every one is built test-first (failing test → implementation → green), with chemistry and geometry in pure functions under `src/utils/` and thin UI on top. We write our own code; if we ever port Octet code (Apache-2.0), we keep its notices and add a `NOTICE` entry.

Recommended order (smallest and most independent first):

| #   | Feature                           | Size | Depends on                |
| --- | --------------------------------- | ---- | ------------------------- |
| A   | Charge and δ+/δ− marks            | M    | —                         |
| B   | Snapping and Clean Up             | S    | —                         |
| C   | Export and "Open in Octet Draw"   | S–M  | —                         |
| D   | Resonance forms and curved arrows | L    | A (charges show on forms) |

---

## A. Charge and δ+/δ− marks

**Why:** students currently only _see_ formal charges we calculate. In class they have to work them out and write them, and for polarity lessons they mark bonds δ+/δ−.

**Model:** each atom gets the marks a student wrote:
`LewisAtom.marks?: { charge?: number; partial?: '+' | '-' }`.

**Tools (toolbar, new "Marks" group):**

- **+ charge** and **− charge**: each tap (or drop) adds +1 or −1 to the atom's written charge, as in ChemDraw. Eraser clears marks.
- **δ** (partial charge): tap to cycle δ+ → δ− → none.

**Checking (`checkStructure` / `assessStructure`):**

- Once all electrons are placed, every atom's written charge must equal its formal charge. Feedback: "Mark N's formal charge (+1)." or "O's formal charge is −1, not +1."
- δ marks, where used, must put δ− on the more electronegative atom of a polar bond (EN difference > 0.4). Feedback: "δ− belongs on the more electronegative atom (O)."
- Optional: polyatomic ions drawn in brackets with the overall charge (see decision 2).

**Hints:** the automatic formal-charge badges would give the answer away. They move behind a **Show hints** switch (electron counts plus formal charges).

**Tests first:**

- reducer: `adjustCharge`, `cyclePartial`, eraser clears marks, undo
- `checkStructure`: missing, wrong and correct charge marks; δ marks correct and reversed; marks ignored until electrons are complete
- page: + and − tools by tap and drag; marks render as superscripts next to the symbol; the hints switch shows and hides badges

---

## B. Snapping and Clean Up

**Why:** dropped and dragged atoms land anywhere, so student drawings get messy and bonds come out at odd lengths.

**Snapping** (pure `snapPosition(structure, atomId, point)`):

- An atom bonded to exactly one neighbour snaps to one bond length from it at the nearest 30° angle.
- Otherwise it snaps to a quarter-bond-length grid.
- New atoms dropped on an atom already use `nextAtomPosition`. A **Snap** switch (on by default) turns it off.

**Clean Up** (pure `cleanUp(structure)`, one undoable action):

- Re-lays out every connected fragment with `layoutSkeleton`, keeping electrons and bonds, and places fragments side by side so none overlap.
- Our skeleton layout handles trees (all 33 library molecules). Rings, which students might draw by mistake, get stretched bonds. That's acceptable here; Octet's Indigo-based `clean2d` is the reference if we ever need proper ring layout.

**Tests first:**

- `snapPosition`: one-neighbour polar snap (length 1, multiple of 30°), grid snap, unbonded atoms
- `cleanUp`: every bond length 1, no atoms overlapping, electrons and bond orders unchanged, separate fragments kept apart
- page: a moved atom snaps; the Clean Up button tidies and Undo restores

---

## C. Export and "Open in Octet Draw" — dropped

> Dropped 11 Nov 2026: not needed for now.

**Why:** students hand in work, and those who want a professional tool can keep going in Octet Draw.

**Export:**

- **PNG** and **SVG** downloads of a clean drawing: no badges, hit areas or highlights, with explicit colours instead of Tailwind classes so the file stands alone.
- **MOL file** (`toMolfile(structure)`, MDL V2000): atoms with coordinates (y flipped), bonds with orders, formal charges as `M  CHG` and unpaired electrons as `M  RAD`. Lone pairs are implied by valence, as in every chemistry format, so Octet recomputes and draws them.

**Open in Octet Draw:**

- Octet is a desktop app with no web link to open files, so this is **Download MOL** plus a short note: "Open it in Octet Draw (File › Open) — free at octet.software."
- Also **Copy MOL** to the clipboard.

**Tests first:**

- `toMolfile`: header and counts line, atom and bond blocks, y flip, `CHG` and `RAD` lines, a round-trip parse for water, nitrate and NO
- export SVG contains no `.hit` elements, badges or Tailwind classes
- page: download buttons create files (mock `URL.createObjectURL`); Copy MOL writes to the clipboard (mocked)

---

## D. Resonance forms and curved arrows

**Why:** level 4 is about resonance, and students currently draw one form and are told how many exist. In class they draw _every_ form and use curved arrows to show the electrons moving between them.

**Model:**

- The workspace holds several forms: `forms: LewisStructure[]`, each a full structure.
- Arrows per form: `CurvedArrow = { from: lone pair | bond; to: atom | bond }`, for electron-pair arrows. Single-electron (fishhook) arrows are later.

**Arrow pushing** (pure `applyArrows(structure, arrows)`):

- lone pair on X → bond X–Y: X loses a pair, and the bond order goes up by one
- bond X–Y → atom Y: the bond order goes down by one, and Y gains a pair
- bond → bond: one order moves from the first bond to the second
- Arrows that would make an impossible structure are reported, not applied.

**Checking:**

- every form is valid and one of the molecule's best structures
- no two forms are the same: "Forms 1 and 3 are the same structure."
- progress: "You've found 2 of 3 resonance structures."
- for each form with arrows, applying them must give the next form: "Your arrows on form 1 don't lead to form 2: N ends up with 10 electrons."

**UI:**

- **Add resonance form** copies the current form; a ↔ arrow sits between forms.
- Desktop shows forms side by side; phones show one form at a time with tabs (Form 1, 2, 3).
- **Curved arrow** tool: drag from a lone pair or bond to an atom or bond. Drawn as a curve with an arrowhead, and the eraser removes it.
- **Resonance arrow** (↔) is drawn automatically between forms, not as a separate tool.

Split into two steps:

- **D1:** multiple forms, the ↔ arrow and resonance grading
- **D2:** curved arrows and the arrow-pushing check

**Tests first:**

- `applyArrows`: ozone, nitrate, carbonate and nitrite arrow sets; impossible arrows rejected
- resonance assessment: all found, missing, duplicates, invalid form
- page: add, switch and delete forms; the curved arrow tool by drag; arrow feedback

---

## Decisions (11 Nov 2026)

1. **Scope:** A and B built; D next; C (export, Open in Octet Draw) dropped.
2. **Hints:** a Show hints switch on every level, on by default.
3. **δ+/δ−:** graded: δ− must go on the more electronegative atom of a polar bond.
4. **Ion brackets:** required: polyatomic ions are drawn in brackets with their overall charge, and neutral molecules are not bracketed.
5. Resonance on phones: decide when D is planned in detail.
