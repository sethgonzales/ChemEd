import { parseCompound, type Reaction } from './reactions';

export type ReactionType =
  | 'synthesis'
  | 'decomposition'
  | 'single replacement'
  | 'double replacement'
  | 'combustion'
  | 'other';

export type ApTag = 'precipitation' | 'acid–base' | 'redox';

const elementsIn = (formula: string) => Object.keys(parseCompound(formula));
// a free element: one kind of atom, like Zn, O₂ or Cl₂
const isElement = (formula: string) => elementsIn(formula).length === 1;

// CₓHᵧ or CₓHᵧO_z burning in oxygen to carbon dioxide and water
function isCombustion({ reactants, products }: Reaction) {
  const fuel = reactants.filter((f) => f !== 'O2');
  return (
    reactants.includes('O2') &&
    fuel.length === 1 &&
    elementsIn(fuel[0]).includes('C') &&
    elementsIn(fuel[0]).includes('H') &&
    elementsIn(fuel[0]).every((e) => 'CHO'.includes(e)) &&
    products.length === 2 &&
    products.includes('CO2') &&
    products.includes('H2O')
  );
}

/** The classic type of a reaction, read from the shape of its equation */
export function classify(reaction: Reaction): ReactionType {
  const { reactants, products } = reaction;
  if (isCombustion(reaction)) return 'combustion';
  if (products.length === 1 && reactants.length >= 2) return 'synthesis';
  if (reactants.length === 1 && products.length >= 2) return 'decomposition';
  if (reactants.length === 2 && products.length === 2) {
    const free = (side: string[]) => side.filter(isElement);
    const [inFree, outFree] = [free(reactants), free(products)];
    // A + BC → AC + B: one element swaps in, a different one comes out
    if (inFree.length === 1 && outFree.length === 1)
      return elementsIn(inFree[0])[0] !== elementsIn(outFree[0])[0]
        ? 'single replacement'
        : 'other';
    // AB + CD → AD + CB: compounds swap partners
    if (!inFree.length && !outFree.length) return 'double replacement';
  }
  return 'other';
}

// HCl, HNO₃, H₂SO₄, H₃PO₄: hydrogen written first, then a nonmetal or ion
const isAcid = (f: string) =>
  /^H\d*[A-Z(]/.test(f) && f !== 'H2O' && f !== 'H2O2';
// a metal hydroxide, like NaOH or Ca(OH)₂ (not an alcohol such as C₂H₅OH)
const isHydroxide = (f: string) => /^[A-Z][a-z]?(OH|\(OH\)\d+)$/.test(f);

/**
 * The AP categories that structure alone can show. Redox: an element free on
 * one side is combined on the other, a sure sign (though not the only one).
 * Precipitation needs solubility rules, so it isn't tagged here.
 */
export function apTags({ reactants, products }: Reaction): ApTag[] {
  const tags: ApTag[] = [];
  const combinedIn = (side: string[]) =>
    new Set(side.filter((f) => !isElement(f)).flatMap(elementsIn));
  const freeMoves = (from: string[], to: string[]) =>
    from.filter(isElement).some((f) => combinedIn(to).has(elementsIn(f)[0]));
  if (freeMoves(reactants, products) || freeMoves(products, reactants))
    tags.push('redox');
  if (
    reactants.some(isAcid) &&
    reactants.some(isHydroxide) &&
    products.includes('H2O')
  )
    tags.push('acid–base');
  return tags;
}
