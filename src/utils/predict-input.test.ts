import { gradeTyped, readFormula } from './predict-input';
import { predict } from './predict';

describe('readFormula: what a student typed, as a plain formula', () => {
  it.each([
    ['Pb(NO3)2', 'Pb(NO3)2'],
    [' Pb(NO₃)₂ ', 'Pb(NO3)2'], // pasted subscripts
    ['Al2 (SO4)3', 'Al2(SO4)3'], // stray spaces
    ['Cu', 'Cu'],
  ])('reads %j as %s', (text, formula) => {
    expect(readFormula(text)).toBe(formula);
  });

  it.each(['', 'pb', 'Xy2', 'Pb(NO3', '2+'])('cannot read %j', (text) => {
    expect(readFormula(text)).toBeNull();
  });
});

describe('gradeTyped', () => {
  const lead = predict(['Pb', 'Cu(NO3)2']); // → Pb(NO₃)₂(aq) + Cu(s)

  it('accepts the right products and states in either order', () => {
    const graded = gradeTyped(lead, [
      { text: 'Cu', state: 's' },
      { text: 'Pb(NO3)2', state: 'aq' },
    ]);
    expect(graded.verdict).toBe('correct');
    expect(graded.hints).toEqual([null, null]);
  });

  it('points at the blank whose state is wrong', () => {
    const graded = gradeTyped(lead, [
      { text: 'Pb(NO3)2', state: 's' },
      { text: 'Cu', state: 's' },
    ]);
    expect(graded.verdict).toBe('wrong-state');
    expect(graded.hints[0]).toMatch(/check its state/i);
    expect(graded.hints[1]).toBeNull();
  });

  const hintFor = (text: string, prediction = lead) =>
    gradeTyped(prediction, [
      { text, state: 'aq' },
      { text: 'Cu', state: 's' },
    ]).hints[0];

  it('explains a formula that isn’t neutral, without giving it away', () => {
    const hint = hintFor('PbNO3');
    expect(hint).toMatch(/PbNO₃ isn’t neutral/);
    expect(hint).toMatch(/Pb²⁺ \(\+2\) and one NO₃⁻ \(−1\) add up to \+1/);
    expect(hint).not.toMatch(/Pb\(NO₃\)₂/);
  });

  it('asks for brackets round a repeated polyatomic ion', () => {
    expect(hintFor('PbNO32')).toMatch(/bracket/i);
  });

  it('notices capitals', () => {
    expect(hintFor('pb(no3)2')).toMatch(/capital/i);
    expect(hintFor('PB(NO3)2')).toMatch(/capital/i);
  });

  it('says when a reactant is typed as a product', () => {
    expect(hintFor('Cu(NO3)2')).toMatch(/Cu\(NO₃\)₂ is a reactant/);
  });

  it('says atoms can’t appear from nowhere', () => {
    expect(hintFor('KNO3')).toMatch(/no K in the reactants/);
  });

  it('reminds that hydrogen gas is diatomic', () => {
    const zinc = predict(['Zn', 'HCl']); // → ZnCl₂(aq) + H₂(g)
    const graded = gradeTyped(zinc, [
      { text: 'ZnCl2', state: 'aq' },
      { text: 'H', state: 'g' },
    ]);
    expect(graded.verdict).toBe('wrong-products');
    expect(graded.hints[1]).toMatch(/diatomic: H₂/);
  });

  it('says when it can’t read a formula at all', () => {
    expect(hintFor('Pb(NO3')).toMatch(/can’t read/i);
  });

  it('grades products typed where nothing happens', () => {
    const none = predict(['Cu', 'Zn(NO3)2']);
    expect(
      gradeTyped(none, [
        { text: 'Cu(NO3)2', state: 'aq' },
        { text: 'Zn', state: 's' },
      ]).verdict,
    ).toBe('no-reaction');
  });
});

describe('gradeTyped: balancing with coefficients', () => {
  // 3Mg(s) + 2Al(NO₃)₃(aq) → 3Mg(NO₃)₂(aq) + 2Al(s)
  const mg = predict(['Mg', 'Al(NO3)3']);
  const products = [
    { text: 'Mg(NO3)2', state: 'aq' as const },
    { text: 'Al', state: 's' as const },
  ];

  it('is correct only once the products are balanced', () => {
    expect(gradeTyped(mg, products, ['3', '2', '3', '2']).verdict).toBe(
      'correct',
    );
    const unbalanced = gradeTyped(mg, products, ['', '', '', '']);
    expect(unbalanced.verdict).toBe('unbalanced');
    expect(unbalanced.balance).toMatch(
      /Count the N: 3 on the left, 2 on the right/,
    );
  });

  it('follows the order the products were typed in', () => {
    const swapped = [products[1], products[0]];
    expect(gradeTyped(mg, swapped, ['3', '2', '2', '3']).verdict).toBe(
      'correct',
    );
  });

  it('asks for the smallest whole numbers', () => {
    const doubled = gradeTyped(mg, products, ['6', '4', '6', '4']);
    expect(doubled.verdict).toBe('unbalanced');
    expect(doubled.balance).toMatch(/divides by 2/);
  });

  it('counts a blank coefficient as 1', () => {
    const zinc = predict(['Zn', 'CuSO4']); // all ones
    expect(
      gradeTyped(
        zinc,
        [
          { text: 'ZnSO4', state: 'aq' },
          { text: 'Cu', state: 's' },
        ],
        ['', '1', '', ''],
      ).verdict,
    ).toBe('correct');
  });

  it('leaves balancing until the products are right', () => {
    const wrong = gradeTyped(
      mg,
      [{ text: 'MgNO3', state: 'aq' }, products[1]],
      ['3', '2', '3', '2'],
    );
    expect(wrong.verdict).toBe('wrong-products');
    expect(wrong.balance).toBeNull();
  });

  it('points a coefficient typed into the formula to its box', () => {
    const graded = gradeTyped(
      mg,
      [{ text: '3Mg(NO3)2', state: 'aq' }, products[1]],
      ['', '', '', ''],
    );
    expect(graded.hints[0]).toMatch(/coefficient.*box in front/i);
  });
});
