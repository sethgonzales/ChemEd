# ChemEd

Interactive chemistry simulations for students. Next.js 15 (pages router), React 19, TypeScript, Tailwind 4, Flowbite React.

## Commands

- `npm run dev` — dev server (`npm run dev -- -H 0.0.0.0` to open it from a phone on the same Wi-Fi)
- `npm test` — run the Jest suite once
- `npm run test:watch` — re-run tests on change
- `npm run lint` — ESLint
- `npx tsc --noEmit` — type check
- `npm run build` — production build, exported as static files to `out/`. It shares `.next/` with the dev server and breaks a running one (500s), so stop `npm run dev` first or restart it afterwards with a fresh `.next/`.
- `npm run deploy` — build and deploy `out/` to Firebase Hosting (project `chemed-app`, https://chemed-app.web.app). Same `.next/` caveat as `build`. The app must stay static: no API routes, `getServerSideProps` or image optimization. Never deploy to `chemed-6a31a`: that's the archived original ChemEd.
- Firestore (`chemed-app`, nam5) rules live in `firestore.rules`, locked until logins exist; deploy them with `firebase deploy --only firestore:rules`.

## Test-driven development (required for every feature and bug fix)

Follow red → green → refactor. No implementation code is written before a failing test exists for it.

1. **Red** — Write a test that describes the new behaviour. Run it and confirm it fails for the expected reason (not a typo or import error). Show the failing output.
2. **Green** — Write the minimum implementation that makes the test pass. Run the suite and confirm it passes.
3. **Refactor** — Clean up while keeping the suite green. Re-run tests after every refactor.
4. Before calling work done, run `npm test`, `npm run lint` and `npx tsc --noEmit`, and report the results honestly.

Bug fixes start with a test that reproduces the bug.

### What to test and where

- Tests live next to the code they cover: `foo.ts` → `foo.test.ts`, `card.tsx` → `card.test.tsx`. **Exception:** page tests go in `src/__tests__/pages/`, because Next.js turns every file under `src/pages/` into a route and the build fails.
- Keep simulation logic (physics, chemistry rules, data lookups) in pure functions under `src/utils/` so it can be tested without a browser. Pages and components should be thin wrappers that render state and wire up input.
- Test simulation behaviour by stepping the model and asserting on observable outcomes (e.g. "a gas fills the container", "hotter particles move faster"), not on internal constants.
- Physics uses randomness; assert on averages over many particles and steps with sensible tolerances, or seed/mock `Math.random`, so tests aren't flaky.
- Components: use React Testing Library (`@testing-library/react`, `@testing-library/user-event`). Query by role, label or text the way a user would, not by class names.
- Canvas drawing isn't worth testing pixel by pixel; test the state that drives it.

## Coding guidelines

- **Reuse before writing.** Check `src/components/`, `src/utils/` and `src/constants/` for something that already does the job, and extend it rather than duplicating it. If two places need the same logic, extract it.
- **Succinct comments.** Explain _why_, or the science behind a formula, in a line or two. Don't narrate what the code obviously does.
- **Match the surrounding code**: naming, file layout, Tailwind usage, Prettier formatting (`.prettierrc`).
- Tunable simulation values are named constants at the top of their module, with units in a comment (e.g. `// px/s^2`).
- Use the `~/` import alias for `src/`.
- Keep changes scoped to the task; mention unrelated issues rather than fixing them silently.
- Scientific content (element data, constants, configurations) must be accurate — double-check values you add or change.
- Every simulation must work on a phone: touch input, narrow screens, no horizontal page scroll.
- Accessibility: interactive elements need accessible names, and controls must work by keyboard.

## Design

Every simulation follows the same structure (see `docs/plans/design-cohesion.md`):

1. `Container` with the title and a one-line `description`.
2. Controls: `Tabs` for modes, `Dropdown` for pickers.
3. A `Stage` holding the main visual, with its readouts and status inside it.
4. One row of `Button`s, with at most one accent ("main") action.
5. `Setting` checkboxes last.

Colour roles (theme scale only, so every theme works):

- Stage background `primary-600`; controls `primary-700` (hover `primary-800`).
- Accent `secondary-500` / `text-secondary`: matter (particles, molecule chips) and the selected tab, tool or main action. Not for decoration.
- Correct: `green-300` text, `green-400` fills. Problems: `red-500/25` background, `red-100` text.
- White is only for drawing paper (Lewis), inside a Stage.

Reuse `Container`, `Tabs`, `Stage`, `Button`, `Dropdown`/`DropdownItem` and `Setting` rather than restyling raw elements.

## Git

- Don't add `Co-Authored-By` trailers (or any other AI attribution lines) to commit messages.
