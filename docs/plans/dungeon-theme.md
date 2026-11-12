# Dungeon-crawler look — plan

Status: **approved** (11 Nov 2026), see Decisions

Make ChemEd feel like a sciencey 8-bit dungeon crawler: each simulation is a chamber to explore, the type and frames look like a retro game, the home cards are colourful pixel art, and the sounds belong in a dungeon. Mr. G already fits this world, so he anchors it.

## What's there now

- **Type:** Arial everywhere (Geist is set up but not used for body text).
- **Colours:** six school themes (Default purple, Cougars, Beavers, Raiders, Warriors, Jaguars). Each is a primary and a secondary colour, turned into scales.
- **Home cards:** a flat coloured box per simulation with an SVG illustration. They grow on hover and play a random wooden **knock**.
- **Header:** the element tiles play a random **chime** on hover.
- **8-bit pieces so far:** Mr. G, and his speech bubble's pixel frame.

## The look

### 1. Type

- **Headings, buttons and labels** in a pixel font. I'd suggest **Pixelify Sans**: it reads as 8-bit but stays readable at small sizes. Press Start 2P is the classic arcade font but is wide and hard to read in sentences.
- **Body text, formulas and chemistry stay in a clean sans** (subscripts, charges and long instructions need it). Pixel fonts don't have good subscripts, and they tire the eyes in paragraphs.
- Loaded with `next/font`, so the font file is served by the app itself, with no request to Google from students' browsers.

### 2. Pixel frames

- A shared **`PixelFrame`**, built from the speech bubble's nine-slice frame: stepped corners and a chunky outline. It frames:
  - the `Container` (each simulation's chamber)
  - the `Stage`
  - buttons, dropdowns and the new checkboxes
- Frames take the theme's colours, so every school theme still works.

### 3. Home: the dungeon map

- Each simulation card becomes a **chamber door**: a stone archway in pixel art with the simulation's own art inside it.
- **Every simulation gets its own colour**, like potions on a shelf: green for States of Matter, blue for Lewis, amber for Reactions, and so on. This makes the cards much more colourful than the current single-colour theme.
- **Torchlight on hover:** a warm flicker around the door instead of growing. It's off with reduced motion.
- **Unbuilt simulations** (Electron Configurations, Titrations) get a **sealed door** with "Coming soon", which ticks off that TODO item too.
- The card art is redrawn as pixel art (pixel maps like Mr. G's), so it matches him.

### 4. Sounds

All made in the browser with Web Audio as now, with no sound files.

- **Hover a door:** a soft stone scrape, or a torch whoosh, much quieter than the knock.
- **Open a door (click):** a low door thud.
- **Correct / balanced:** a short 8-bit "treasure found" arpeggio.
- **Header tiles:** the chimes become a soft crystal or potion "bloop".
- **A mute button** in the header, remembered in the browser. Teachers in a quiet classroom will want it, and some students find sounds distracting.

### 5. Colour

- A new **Dungeon theme** in the picker: dark stone gray-blue with torch-orange accents.
- The school themes stay. The fonts, frames, cards and sounds apply to all of them, and only the colours change.

## Phases (each test-first where there's behaviour)

1. **Type and frames** (done): the pixel heading font and `PixelFrame`, applied to `Container`, `Stage`, `Button`, `Dropdown` and `Setting`. Reviewed from screenshots before going further.
2. **Home map** (done): chamber-door cards with per-simulation colours, torchlight hover and sealed doors.
3. **Card art** (done): pixel-art illustrations for each simulation.
4. **Sounds:** the new sound set, the mute button, and the "correct" sound tied to the cheers Mr. G already gives.
5. **Dungeon theme:** the new colour theme, and a check that every theme still has enough contrast.

## Decisions (11 Nov 2026)

1. **Font:** pixel type for headings and buttons only; body text, formulas and chemistry stay in a clean sans.
2. **Theme:** Dungeon becomes the **new default**. The school themes stay as colour schemes only; the fonts, frames, cards and sounds are the same in every theme.
3. **Sounds:** only on clicks and successes, with no hover sounds.
4. **Card art:** I draw first ideas for Seth to review before building them.
