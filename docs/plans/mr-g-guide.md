# Mr. G — the in-app guide

Status: **done** (11 Nov 2026) — see Decisions

Mr. G is an 8-bit version of Seth who lives in the bottom corner of every page on desktop. He wanders a little, gives tips on how to use the page, cheers students on, and explains mistakes in the simulations.

## Look

- **8-bit pixel art**, drawn as SVG squares from a small pixel map (about 24 × 32 pixels). There are no image files, so he stays sharp at any size.
- **Light blue lab coat** and **safety goggles**. The rest of his likeness (hair, skin tone, facial hair, glasses) comes from a photo or description of Seth (see decision 1).
- About 96 px tall, so he never crowds the page.
- **Animation frames:**
  - **idle:** breathing, with a blink every few seconds
  - **walk:** 2 frames
  - **talk:** mouth moving while a bubble is open
  - **wave:** greeting
  - **celebrate:** a small jump, when a student gets something right
  - **think:** hand on chin, when a student gets something wrong

## Where and when

- Fixed to the **bottom-right corner**, desktop only. He's hidden below the `md` breakpoint, so phones never see him.
- Wanders a short way along the bottom edge now and then (every 20–40 s), then settles. He never walks over the main buttons.
- **Speech bubble** above him, with the name "Mr. G" and a short message. It closes on its own after a few seconds (longer for longer messages), or with ✕ or Escape.
- **Clicking Mr. G** gives a tip for the current page.
- A small **hide** control tucks him into a tab at the edge of the screen. The choice is remembered in the browser, and the tab brings him back.

## What he says

1. **Welcome / how to use:** one tip the first time a student opens each simulation in a session, e.g. "Pick a tool, then click the drawing. Your cursor shows what you'll place."
2. **Tips on request:** clicking him cycles through that page's tips.
3. **Hints when something's wrong:** simulations tell Mr. G what happened and he explains it, in his own voice:
   - Balancing, not yet balanced: "Oxygen's off by one. Try changing the O₂ in front."
   - Lewis, _Check your work_ with problems: "Oxygen only has 6 electrons. Can you give it another lone pair?"
4. **Encouragement:** when something is balanced or correct, he celebrates: "Nice! Every element matches." / "Textbook Lewis structure!"
5. **Nudges:** if a student has been stuck (no progress) for about a minute, at most once per activity.

**Not annoying:** at most one unprompted message every 2 minutes, a hint only right after an action, and nothing while a student is typing or dragging.

## How it's built

- **`GuideProvider`** wraps the app (in `_app.tsx`). It tracks the current page and Mr. G's state, and exposes a **`useGuide()`** hook:
  - `say(message, { mood })`, where mood is `tip`, `hint`, `cheer` or `nudge`
  - `react(event)`: simulations report events such as `{ type: 'balanced' }` or `{ type: 'check', problems }`, and Mr. G picks the line
- **Pure, tested logic** in `src/utils/guide.ts`:
  - each page's tips
  - turning simulation events into messages
  - when he's allowed to speak (the throttling rules above)
  - how long a bubble stays open
- **Components:**
  - `MrG`: the sprite and its animation frames
  - `SpeechBubble`
  - `Guide`: places him, wanders and handles hiding
- **Accessibility:**
  - bubbles are announced politely, as a live region
  - Mr. G is a real button
  - Escape closes the bubble
  - he never takes focus
  - with reduced motion: no walking or jumping, only swapping between frames

## Phases (each test-first)

1. **Sprite:** the pixel map, palette and animation frames for Mr. G, reviewed by Seth from screenshots before anything else.
2. **Guide shell:** the provider, the bubble, placement, desktop only, hiding, wandering and reduced motion.
3. **Page tips** (done): welcome and on-click tips for Home, Periodic Table, States of Matter, Lewis Structures and Chemical Reactions. The tips live in `src/constants/guide-tips.ts`. He introduces himself once per browser tab, welcomes you to each page once, and clicking him cycles through that page's tips.
4. **Simulation events** (done): balancing hints and cheers, Lewis _Check your work_ hints and cheers, States of Matter phase changes ("It's melting!"). Cheers come half a second after the change, balancing hints wait for a 3-second pause, and phase changes wait for the slider to settle.
5. **Polish** (done): unprompted hints, phase tips and nudges are spaced at least two minutes apart, while answers to what a student does always come through. He nudges once after a minute stuck (an unbalanced equation, or drawing without checking). While he's on screen, the Lewis feedback box keeps only whole-structure problems and points to the red atoms; phones keep the full list.

## Decisions (11 Nov 2026)

1. **Likeness:** oval face, short medium-brown hair brushed over to one side with goggles pushed up on it, soft, raised and arched eyebrows, blue-gray eyes, light stubble down both sides of the face with a mustache that runs down beside the mouth into the chin stubble, and a light blue lab coat worn open over a red flannel shirt.
2. **Corner:** bottom-right (moved from bottom-left, where he covered more of the pages).
3. **Hints on desktop:** Mr. G gives the friendly hint; the page keeps a short status line. Phones keep the full hints.
4. **How chatty:** a welcome tip per simulation, plus hints and cheers. Scale back if it turns out to be too much.
