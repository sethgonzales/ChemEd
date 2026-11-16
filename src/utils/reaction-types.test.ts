import { REACTIONS } from '~/constants/reactions';
import { parseEquation } from './reactions';
import { apTags, classify, type ReactionType } from './reaction-types';

const typeOf = (equation: string) => classify(parseEquation(equation));
const tagsOf = (equation: string) => apTags(parseEquation(equation));
const practice = (level: number) =>
  REACTIONS.filter((r) => r.level === level).map((r) => r.equation);

describe('classify: the five types, from the shape of the equation', () => {
  it.each([
    ['H2 + O2 -> H2O', 'synthesis'],
    ['CaO + CO2 -> CaCO3', 'synthesis'], // two compounds can combine too
    ['KClO3 -> KCl + O2', 'decomposition'],
    ['CaCO3 -> CaO + CO2', 'decomposition'],
    ['Zn + HCl -> ZnCl2 + H2', 'single replacement'],
    ['Cl2 + NaBr -> NaCl + Br2', 'single replacement'], // a nonmetal swaps
    ['AgNO3 + NaCl -> AgCl + NaNO3', 'double replacement'],
    ['CH4 + O2 -> CO2 + H2O', 'combustion'],
    ['C2H5OH + O2 -> CO2 + H2O', 'combustion'], // fuels may hold oxygen
    ['Fe2O3 + CO -> Fe + CO2', 'other'],
  ] as [string, ReactionType][])('%s is %s', (equation, type) => {
    expect(typeOf(equation)).toBe(type);
  });

  it('calls each practice synthesis and decomposition what it is', () => {
    for (const equation of practice(1)) {
      const { reactants, products } = parseEquation(equation);
      expect(typeOf(equation)).toBe(
        reactants.length === 1 ? 'decomposition' : 'synthesis',
      );
      expect(products.length === 1 || reactants.length === 1).toBe(true);
    }
  });

  it('calls every practice combustion a combustion', () => {
    for (const equation of practice(2))
      expect(typeOf(equation)).toBe('combustion');
  });

  it('sorts the practice replacements into single and double', () => {
    expect(practice(3).map(typeOf)).toEqual([
      'single replacement', // Zn + HCl
      'single replacement', // Al + CuSO₄
      'double replacement',
      'double replacement',
      'double replacement', // H₂SO₄ + NaOH, a neutralization
      'double replacement',
      'double replacement',
    ]);
  });

  it('leaves the college redox equations as other: they fit none of the five', () => {
    for (const equation of practice(4)) expect(typeOf(equation)).toBe('other');
  });
});

describe('AP tags', () => {
  it('tags redox when an element is free on one side and combined on the other', () => {
    for (const equation of [...practice(1), ...practice(2), ...practice(4)])
      expect(tagsOf(equation)).toContain('redox');
    expect(tagsOf('Zn + HCl -> ZnCl2 + H2')).toContain('redox');
    expect(tagsOf('CaCO3 -> CaO + CO2')).not.toContain('redox');
    expect(tagsOf('AgNO3 + NaCl -> AgCl + NaNO3')).not.toContain('redox');
  });

  it('tags acid–base when an acid and a hydroxide make water', () => {
    expect(tagsOf('H2SO4 + NaOH -> Na2SO4 + H2O')).toContain('acid–base');
    expect(tagsOf('Ca(OH)2 + H3PO4 -> Ca3(PO4)2 + H2O')).toContain('acid–base');
    expect(tagsOf('Zn + HCl -> ZnCl2 + H2')).not.toContain('acid–base'); // no base
    expect(tagsOf('C2H5OH + O2 -> CO2 + H2O')).not.toContain('acid–base'); // ethanol isn't a hydroxide base
  });

  it('gives a plain swap of ions no tag until solubility says it precipitates', () => {
    expect(tagsOf('Pb(NO3)2 + KI -> PbI2 + KNO3')).toEqual([]);
  });
});
