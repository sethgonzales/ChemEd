# Dungeon Quest — plan

Status: **planned** (17 Nov 2026), see Decisions

A step-by-step dungeon crawl that strings the simulations' quizzes together as levels. Each level is a chamber: a wall of story text sets up a problem, a few rooms each pose a challenge, and a chemistry boss waits at the end. The dungeon grows with the app: every new simulation adds its questions to the bank and its own chamber to the quest.

## A level

1. **Story wall**: a short scene in the pixel frame, told by Mr. G ("The bridge over the acid moat only holds if the equation balances…"). One screen, with a Begin button. The story is fiction, but any real chemistry it states is cited like the rest of the app.
2. **Rooms** (2–3): each room is one challenge on the chamber's topic. Solving it opens the door to the next room. A wrong answer shows Mr. G's hint and lets the student try again, with no hearts lost in rooms.
3. **Boss**: a pixel-art boss with an HP bar, and the student's hearts. Each right answer hits the boss and each wrong one costs a heart. Questions get harder as the boss weakens, using the difficulty levels the banks already have (`REACTIONS` and `MOLECULES` both have `level`).
4. **Loot**: a treasure screen with the treasure sound, a star rating (hearts left) and the next door unsealed.

**Running out of hearts:** the hearts refill and the boss resets with fresh questions. Cleared rooms stay cleared, and Mr. G says what went wrong.

## Challenges

There are two kinds, both from a shared question bank:

- **Interactive**: the real piece of a simulation, embedded in a room, for example the balancer with its scale, Predict's ion builder or the orbital boxes. Used for rooms, where a slower, richer challenge fits.
- **Quick**: multiple choice or a short typed answer, generated from the same cited data, for example "Which element is in group 17, period 3?" or "What phase is benzene at 2 °C?". Used for boss hits, so a fight keeps moving.

### The question bank

- Every simulation contributes a **question source** under `src/constants/quest/` (or beside its data), built from the data it already uses and cites. **No separate general chemistry bank:** questions come only from the simulations.
- A source generates questions from a seeded random generator, so tests are deterministic and retries get new questions.
- **Adding a simulation means adding its questions.** A test checks that every `ready` simulation in `SIMULATIONS` has a question source and a chamber, so a new simulation can't ship without them. This rule goes in CLAUDE.md.

## The start screen

- A **dungeon map** of chamber doors in topic order, joined by a path down to the final chamber's sealed gate. Each door shows its stars.
- **Any level can be picked from the start.** The order is a suggested route, not a lock. The final chamber unseals once every other chamber is cleared.
- **Teacher links**: `/dungeon-quest?chamber=<id>` skips the map and opens that chamber's story wall. It's a static query string, so the app stays a static export.
- **Replays**: a cleared chamber can be played again with new questions. The best star score is kept.

## Chambers (in topic order; names and bosses to review)

A chamber takes **about 5 minutes**: a story wall of a few lines, 2 rooms and a boss with about 5 HP.

| # | Chamber | Rooms | Boss |
| --- | --- | --- | --- |
| 1 | Periodic Table | Element riddles, trend puzzles | The Element Sphinx |
| 2 | Electron Configurations | Fill the orbital boxes, write the notation | The Orbital Lich |
| 3 | Lewis Structures | Valence electrons, draw a molecule | The Bond Weaver |
| 4 | States of Matter | Phase at a temperature, heating-curve reading | The Frost Wyrm |
| 5 | Reaction Balancing | Balance the bridge, the door seal | The Unbalanced Golem |
| 6 | Chemical Reactions | Sort a reaction, predict the products | The Precipitate Slime |
| 7 | Titrations | Read the burette, pick the indicator | The Acid Hydra |
| 8 | Electrochemistry | Pick the anode, find E°cell | The Voltaic Wraith |
| ★ | Final chamber | — | The Alchemist (questions from every chamber) |

New simulations slot into the order where their topic falls.

## The look

**The dungeon is dark and spooky.** Inside the quest the Stage is close to black, lit only by Mr. G's lamp and the torches:

- a warm pool of light around Mr. G
- torches flickering on the walls
- slow fog along the floor
- stone and dripping ooze from the Dungeon theme

The dark comes from an overlay on the theme's own scale, so every theme still works, and the text stays readable on top of it. With reduced motion, the flicker, fog and drips hold still.

**Mr. G is in the corner, in a hooded cape and holding a lamp.** It's a quest-only outfit, the way goggles are for the wet labs (an option for `spriteRows`). On desktop he stays in the bottom-right corner as usual. On phones, the quest is the one page that shows him: a small sprite beside the story text and hints, since he narrates the game.

**The villains are animated pixel art**, drawn like Mr. G's sprite from pixel maps with their own palettes. Each one is made of its chemistry:

- **The Element Sphinx**: a stone sphinx with periodic-table tiles for scales
- **The Orbital Lich**: a skeleton circled by glowing s and p orbital lobes
- **The Bond Weaver**: a spider whose web is bonds and lone-pair dots
- **The Frost Wyrm**: an ice dragon that steams when hit
- **The Unbalanced Golem**: mismatched atom boulders, tipping like the balance-beam scale
- **The Precipitate Slime**: a clear ooze with solid clouding inside it
- **The Acid Hydra**: heads made of flasks, each in a different indicator colour
- **The Voltaic Wraith**: a ghost crackling between two electrodes
- **The Alchemist**: the final boss, wearing a bit of every other villain

**Every villain has the same frames:**

- **idle**: bobbing, breathing or flickering
- **attack**: when the student answers wrong
- **hit**: a flash and a shake when the student answers right
- **defeat**: collapsing into a puff of its substance

The first villain and Mr. G's new outfit get drawn and reviewed from screenshots before the rest, as with the door art.

## How it's built

- **Engine** in `src/utils/quest.ts`, pure and tested: the level state machine (story → rooms → boss → loot), hearts, boss HP, difficulty ramp, retries and generating questions from the seeded generator.
- **Progress** saved in the browser for now (cleared chambers, stars), behind a small interface so Firestore can replace it once student logins exist. Later it can feed the avatar builder's achievements.
- **Page** `/dungeon-quest`, with its own door on the home map. Components: `QuestMap` (chamber doors), `StoryWall`, `Room`, `BossFight`, `Loot`. They follow the shared design (`Container`, `Stage`, `Button`, one accent action).
- **Interactive rooms** reuse the simulations' components. Where a component is tied to its page, the reusable part gets extracted first.
- **Sounds and Mr. G**: hits use the treasure sound, misses thunk, and Mr. G narrates, hints and cheers through `useGuide`.
- **The quest outfit is a layer, not a redrawn Mr. G**, so student avatars can wear it later. Every character sprite shares Mr. G's grid: 20 × 30, with the face at the same rows and columns and the same frames (idle, blink, talk, walk). The outfit takes any such sprite and applies, in order:
  - the hood over the head rows, keeping the face's middle 12 columns
  - the goggles over the eye rows
  - the cloak over the body
  - the lantern in front
  - the sprite's own feet below

  A test runs the outfit on more than one sprite, so it can't quietly depend on Mr. G's pixels. When the avatar builder exists, the student's avatar becomes the hero walking room to room, and Mr. G stays the narrator in the corner.
- **Villain sprites** in `src/constants/villains/`, with pixel maps and named frames like `mr-g-sprite.ts`, drawn by the shared `PixelArt` component.
- **Phones and accessibility**: tap-only, no timed questions, the boss's and hearts' state announced in a live region, and boss animations off with reduced motion.

## Phases (each test-first)

1. **Engine**: the state machine, hearts, boss HP and seeded questions, all in pure functions.
2. **The look**: the dark quest Stage, with lamp light, torches and fog. Mr. G's hooded cape and lamp. The Unbalanced Golem's frames. Reviewed from screenshots before going further.
3. **First chamber, Reaction Balancing**: story, two balancer rooms, the Golem fight with quick balancing questions, loot and saved progress. Also the start screen with level picking, the chamber links and the page's door on the home map. Reaction Balancing goes first because its balancer is already self-contained, even though it's fifth in the topic order.
4. **Question sources for the other simulations**, plus the test that each `ready` simulation has one.
5. **The other chambers**, one at a time, each with its villain.
6. **The final chamber**: the Alchemist, mixing every bank.

## Not in scope (for now)

Logins and Firestore progress, avatars and unlocks, free movement around a map, timers, leaderboards and multiplayer.

## Decisions (17 Nov 2026)

1. **Movement:** room by room in a straight line (story → rooms → boss), moving on with a door button. No map to walk around.
2. **Challenges:** a mix. Real interactive pieces in rooms, quick generated questions for boss hits.
3. **Failure:** running out of hearts refills them and resets the boss with new questions. Cleared rooms stay cleared.
4. **Topics:** questions come only from the simulations. Each new simulation adds its questions to the bank.

5. **Path:** the chambers are levels in topic order, leading to a final boss. Students can pick any level from the start screen, and the final chamber opens once every other chamber is cleared.
6. **Teacher links:** each chamber has its own link (e.g. `/dungeon-quest?chamber=balancing`) that opens straight to its story wall, so a teacher can send the class to one topic.
7. **Length:** about 5 minutes per chamber.
8. **Replays:** cleared chambers can be replayed with new questions for more stars. The best score is kept.
9. **Look:** dark and spooky, with animated chemistry villains and Mr. G in a hooded cape with a lamp (see The look).
10. **Villains approved** (17 Nov 2026): Seth approved the first sketches of all nine villains ([gallery](https://claude.ai/artifact/1YeQUEDur3dWx4UB9YcSzd)). They're drawn on a 40 × 40 grid with an automatic dark outline. Defeat breaks each villain into its substance: gravel, bone dust, steam, loose atoms, yellow sludge, acid, sparks or smoke. Before a villain goes in the app, its chemistry gets cited, for example lead(II) iodide's yellow, the direction electrons flow in a zinc–copper cell, and CPK colours.
11. **Mr. G's quest outfit approved** (17 Nov 2026), [gallery](https://claude.ai/artifact/1YeQUEDur3dWx4UB9YcSzd): a deep hood that covers his hair and ears, goggles down over his eyes, and a cloak with a gold clasp, closed round the front except for a sliver of coat and flannel at the chest. He holds a flickering lantern in front of him in both hands, a little right of centre.
