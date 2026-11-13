import { ELECTRONEGATIVITY } from './electronegativity';
import { ELEMENTS } from './elements';

/** The quick-pick elements in the Lewis builder's toolbar, as in ChemDraw */
export const COMMON_ELEMENTS = [
  'H',
  'C',
  'N',
  'O',
  'F',
  'P',
  'S',
  'Cl',
  'Br',
  'I',
];

/**
 * Elements the builder can check: main-group elements of periods 1–5 with an
 * electronegativity, which formal charge and δ grading rely on.
 */
export const DRAWABLE_ELEMENTS = ELEMENTS.filter(
  (e) =>
    (e.block === 's' || e.block === 'p') &&
    e.period <= 5 &&
    e.symbol in ELECTRONEGATIVITY,
);
