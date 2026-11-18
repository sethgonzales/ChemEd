# Balloon Riser — plan

Status: **approved** (18 Nov 2026), see Decisions. Phase 1 (engine) in progress.

A game where Mr. G flies a sealed gas balloon from platform to platform across a side-on sky. Each hop is a gas law problem worked out with real numbers: the student reads the instruments, types an answer, and the balloon flies on that number. The flight is the feedback: a right answer lands on the platform, a wrong one overshoots or sinks short. It covers Boyle's, Charles's, Gay-Lussac's and Avogadro's laws, and the combined and ideal gas laws. Dalton's law, Graham's law and real gases are AP extras.

Replaces the sealed "Gas Law Balloon" door (`GAMES` in `src/constants/index.ts`), renamed **Balloon Riser** at `/balloon-riser`.

## Why a sealed gas balloon

A hot air balloon is open at the bottom, so its pressure always matches the air's and only Charles's law moves it. A sealed balloon, like a weather or research balloon, obeys all the laws on its own:

- **Slack** (not yet stretched full): the gas pressure matches the air outside, so the volume follows the gas: V = nRT/P. Rising into thinner air makes it swell (Boyle), heating swells it (Charles), adding helium swells it (Avogadro).
- **Taut** (the fabric at its full size): the volume can't grow, so heating or adding gas raises the pressure instead (Gay-Lussac). The gauge has a burst line.
- **Lift**: the balloon floats when the air it pushes aside weighs as much as everything it carries (Archimedes). The air's density comes from the ideal gas law too: ρ = PM/RT.

## A leg: platform to platform

1. **Land on a platform.** The balloon touches down, and the scene pauses.
2. **Briefing.** Mr. G says only the goal and what's changing: "The ridge is our next stop. The tank's jammed, so all we've got is the heater. How hot does the helium need to be?" **No numbers in the briefing.**
3. **Read the instruments.** Every value is a measurement in the world, not a prompt:
   - the **altimeter** on the basket
   - **thermometers** for the gas inside and the air outside
   - the **barometer** for the air pressure outside, and the **balloon gauge** for the gas inside
   - the balloon's **volume**, and the **tank gauge**
   - a **weather station on each platform**, showing that height's air pressure and temperature (real standard-atmosphere values)
   - the **height sign** on the platform itself

   Tapping an instrument opens a close-up with its reading and units.
4. **Work it out.** A calculation pad: the student types a number and picks its unit (K or °C, kPa or atm, L or m³, mol). Scratch space for working, and Mr. G's hint on request.
5. **Fly.** The typed value sets the control (heater temperature, moles added or vented, ballast dropped), and the physics flies it. The wind carries the balloon across to the next platform.
6. **Land or miss.**
   - **Within tolerance**: it lands, the treasure sound plays, and the next leg begins.
   - **Off**: the balloon sails past or sinks short. Mr. G shows the worked calculation from the same instrument readings, and the leg resets for another try.

## Levels

Each level is a short flight of 3–5 legs, one law at a time to begin with. The controls a level doesn't use are locked, with a reason ("the tank's empty").

| # | Level | What changes | Calculation |
|---|---|---|---|
| 1 | Boyle's law | Height, so the outside pressure (the heater holds the gas at a set temperature) | P₁V₁ = P₂V₂ |
| 2 | Charles's law | The heater | V₁/T₁ = V₂/T₂, in kelvin |
| 3 | Gay-Lussac's law | The heater on a taut balloon, below the burst line | P₁/T₁ = P₂/T₂ |
| 4 | Avogadro's law | The tank and the vent | V₁/n₁ = V₂/n₂ |
| 5 | Combined gas law | Climbing and cooling together | P₁V₁/T₁ = P₂V₂/T₂ |
| 6 | Ideal gas law | Moles to fill or vent for a given float | PV = nRT |
| 7 | Free flight | Every control, hands on, to a far platform with coins on the way | Any |
| AP 1 | Dalton's law | A balloon of mixed helium and air | Partial pressures, mole fractions |
| AP 2 | Graham's law | A long flight: helium leaks out of the fabric faster than air leaks in | Rate ∝ 1/√M |
| AP 3 | Real gases | The high-pressure helium tank isn't ideal | van der Waals vs ideal |

- **The course** (General Chemistry or AP) is picked at the start, like Dungeon Quest's gate. AP gets the AP levels and harder numbers (more steps, unit conversions).
- **Tolerance**: an answer within about 2% lands, so rounding the instrument readings doesn't fail a correct method.
- **Stars**: by tries per leg, kept in the browser for each course.

## The world

- **Side-on sky**, scrolling with the balloon: the ground, hills, mesas, towers and mountain ledges as platforms at different heights, with clouds and birds in layers.
- **An altitude strip** down the side, marked in metres, so heights read like a ruler.
- **Wind** carries the balloon sideways at a steady game speed. Wind speeds are game values, not real data, and are labelled as such.
- **The rider is the player's sprite.** Mr. G rides in the basket for now. Once the avatar builder exists, the student's own avatar rides instead. Mr. G then gives the briefings and tips by radio, from a small portrait at the side of the scene.
- **The flying outfit is a layer, not a redrawn sprite**: goggles up, a scarf and a flight jacket, applied to any sprite on Mr. G's 20 × 30 grid, the way Dungeon Quest's hooded cape is. Only the top half of the rider shows above the basket, so the outfit only needs those rows.
- **Music and sound**: a light, breezy theme (not the dungeon's), the heater's roar, the valve's hiss, the treasure sound on landing.
- **Phones**: big touch controls under the scene, no horizontal page scroll, and every instrument readable at 375 px.

## How it's built

- **Pure engine in `src/utils/`**, tested without a browser:
  - `atmosphere.ts`: the air's pressure, temperature and density at a height, from the U.S. Standard Atmosphere 1976 (troposphere: a 6.5 K/km lapse rate from 288.15 K and 101.325 kPa at sea level).
  - `gas-laws.ts`: solvers for each law, used both to fly the balloon and to grade and show worked answers, so the two can't disagree.
  - `balloon.ts`: the balloon's state (n, T, P, V, slack or taut, height, speed) stepped through time: lift, weight and air drag, with the fabric's full volume and burst pressure.
  - `balloon-legs.ts`: each level's legs (platform heights, starting state, locked controls, what's asked), and seeded random numbers within each leg so retries get fresh values.
- **Tests step the model and check outcomes**: the balloon swells as it climbs, a taut balloon's pressure rises when heated, the right answer lands on the platform, and a 10% error misses.
- **The rider is a prop**: `BalloonScene` takes the rider's sprite rather than drawing Mr. G itself, so swapping in a student's avatar later is a one-line change. The default is Mr. G.
- **Components**: `BalloonScene` (the sky, the platforms and the balloon), `Instrument` (a gauge and its close-up), `CalcPad` (typed answer and unit), plus `Container game`, as the games section in CLAUDE.md says.
- **Dungeon Quest**: once the engine exists, a gas laws question source can come from the same data, with a chamber of its own (a later phase).

## Facts to check and cite

Each goes in `src/constants/sources.ts` and the page's Sources footer before it's used:

- **The standard atmosphere**: U.S. Standard Atmosphere 1976 (NOAA, NASA, USAF): sea-level P, T and density, and the lapse rate.
- **The gas constant R**: CODATA 2022, via NIST.
- **Molar masses**: He, H₂, N₂, O₂ and dry air (IUPAC standard atomic weights; the composition of dry air from the U.S. Standard Atmosphere).
- **van der Waals constants for helium**: CRC Handbook.
- **Graham's law**: a textbook or a Wikipedia page that cites one.
- **The balloon itself** (fabric size, burst pressure, the basket's and Mr. G's mass): game values, labelled as such, kept in the range of real balloons.

## Phases (each test-first)

1. **Engine**: atmosphere, gas law solvers and balloon physics, all cited.
2. **The look**: the sky, platforms, the balloon with its rider (Mr. G in his flying outfit), instruments and controls. Reviewed from screenshots before going further.
3. **Level 1 (Boyle's law) end to end**: briefing, instruments, calculation pad, flight, landing and retry, stars saved, course picker, and the door unsealed and renamed.
4. **Levels 2–4**: Charles's, Gay-Lussac's and Avogadro's laws.
5. **Levels 5–7**: combined, ideal and free flight.
6. **AP levels**: Dalton's law, Graham's law, real gases.
7. **Dungeon Quest**: a gas laws question source and chamber.

## Decisions (18 Nov 2026)

1. **Name**: Balloon Riser, at `/balloon-riser`.
2. **AP extras**: Dalton's law, Graham's law and real gases are in, as AP levels.
3. **Answers are typed**, with units, at every platform, free flight included.
4. **Values are measured, not given**: the briefing states only the goal; every number comes from an instrument or a platform's weather station.
5. **The rider is the player's sprite**: Mr. G until avatars exist.
6. **Wind**: one steady wind for now. Layers blowing different ways at different heights (steering by height, as real balloonists do) can come later.
7. **Helium only** for now; hydrogen could come later as a safety lesson.
