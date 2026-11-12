# Design cohesion — plan

Status: **done** (12 Nov 2026): phases 1–4 built, plus the Periodic Table pass

Reaction Balancing looks like one designed piece; States of Matter and the area around the Lewis builder don't. This plan gives every simulation the same structure, colours and shared components.

## What Balancing does right (the pattern to copy)

- One themed card (the **Stage**) holds the main visual and its readouts.
- Controls (tabs, pickers) sit above the Stage; actions sit in one row below it.
- The accent colour means **matter** (molecule chips), never decoration.
- Text is short: a title, one sentence, then the activity.

## Design rules (added to CLAUDE.md)

**Page structure**, top to bottom:

1. `Container` with the simulation's title and a one-line description (`description` prop).
2. Controls row: mode tabs (`Tabs`), pickers (`Dropdown`).
3. `Stage`: the visual, plus its readouts and status inside it.
4. Actions row: `Button`s, with at most one accent ("main") action.
5. Settings (`Setting` checkboxes) last.

**Colour roles** (all from the theme scale, so every theme works):

| Role                                                                         | Classes                                          |
| ---------------------------------------------------------------------------- | ------------------------------------------------ |
| Page / container                                                             | `primary-400` / `primary-500` (existing)         |
| Stage background                                                             | `primary-600`                                    |
| Controls (buttons, dropdowns, toolbars)                                      | `primary-700`, hover `primary-800`               |
| Matter (particles, molecule chips) and the selected tab, tool or main action | `secondary-500` with `text-secondary`            |
| Correct / balanced                                                           | `green-300` text, `green-400` fills              |
| Problems                                                                     | `red-500/25` background, `red-100` text          |
| Drawing paper (Lewis only)                                                   | white, inside a Stage, so it reads as deliberate |

## Phase 1 — shared components (test-first)

- **`Tabs`**: replaces the copy-pasted mode tabs in Lewis and Reactions. Tab list and panels, inactive panels stay mounted (hidden) so each keeps its work, **arrow-key navigation** between tabs (new; standard tab keyboard behaviour).
- **`Stage`**: the themed card, a labelled region with optional `header` and `footer` slots.
- **`Setting`**: the checkbox row, moved out of the Lewis builder.
- **`Container`**: gains an optional `description` shown under the title.

## Phase 2 — States of Matter

- The canvas sits in a `Stage` on the themed background; the white box goes. Particles stay the accent colour, now with good contrast.
- **Readouts in the Stage header**: a **phase badge** (Solid / Liquid / Gas, with a melting or boiling hint inside the transition bands) and a **large temperature** in °C with Kelvin underneath. The phase label moves off the canvas into real text, so screen readers get it too.
- **Slider** spans the Stage under the canvas, with a cold-to-hot gradient track.
- Description: one sentence on what to do.
- Phone: canvas full width with a fixed height.

## Phase 3 — Lewis Structures

- Description shortened to one line; the full instructions move into a **"How to draw"** disclosure.
- **One Stage** holds everything for the drawing:
  - header: resonance form tabs and add/remove buttons on the left, the electron counter on the right
  - body: toolbar and the white drawing paper
  - footer: Undo/Redo/Reset/Clean Up, then Check your work (the one accent action)
- Feedback appears right under the Stage; settings last.
- Draw / Quiz use the shared `Tabs`.

## Phase 4 — Chemical Reactions

- Uses `Tabs`, `Stage` and `Container description`, replacing its own versions. No visual change intended beyond matching the others exactly.

## Later (done)

- Periodic Table: the same Stage and colour rules (smaller pass).
- Home page cards: replaced by the dungeon doors ([dungeon-theme.md](dungeon-theme.md)).

## Testing

- Behaviour (tabs switching and arrow keys, phase badge text, temperature readout, disclosure) is test-first.
- Layout and colour are checked with desktop and phone screenshots, not class-name tests.
- Existing tests must stay green; ones that check how something is shown (e.g. the canvas phase label) are updated first to describe the new behaviour.
