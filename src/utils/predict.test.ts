import {
  check,
  compound,
  dealPredict,
  ionsOf,
  pieces,
  predict,
  PREDICT_POOL,
  type Product,
} from './predict';

describe('ionsOf', () => {
  it('splits a salt into its ions and charges', () => {
    expect(ionsOf('Al2(SO4)3')).toEqual({
      cation: { symbol: 'Al', charge: 3 },
      cations: 2,
      anion: { symbol: 'SO4', charge: -2 },
      anions: 3,
    });
    expect(ionsOf('PbI2')).toEqual({
      cation: { symbol: 'Pb', charge: 2 },
      cations: 1,
      anion: { symbol: 'I', charge: -1 },
      anions: 2,
    });
  });

  it('treats an acid’s hydrogen as H⁺', () => {
    expect(ionsOf('H2SO4')?.cation).toEqual({ symbol: 'H', charge: 1 });
    expect(ionsOf('HCl')?.anion).toEqual({ symbol: 'Cl', charge: -1 });
  });

  it('finds no ions in an element or a molecule', () => {
    expect(ionsOf('Cu')).toBeNull();
    expect(ionsOf('H2')).toBeNull();
    expect(ionsOf('H2O')).toBeNull();
    expect(ionsOf('CH4')).toBeNull();
  });
});

describe('compound: a neutral formula from two ions', () => {
  it.each([
    ['Al', 3, 'SO4', -2, 'Al2(SO4)3'],
    ['Ca', 2, 'PO4', -3, 'Ca3(PO4)2'],
    ['Na', 1, 'Cl', -1, 'NaCl'],
    ['Pb', 2, 'I', -1, 'PbI2'],
    ['Ba', 2, 'OH', -1, 'Ba(OH)2'],
    ['Cu', 2, 'SO4', -2, 'CuSO4'],
    ['H', 1, 'NO3', -1, 'HNO3'],
    ['H', 1, 'OH', -1, 'H2O'], // an acid's H⁺ and a base's OH⁻ make water
  ] as const)('%s%i and %s%i make %s', (c, cc, a, ac, formula) => {
    expect(compound({ symbol: c, charge: cc }, { symbol: a, charge: ac })).toBe(
      formula,
    );
  });
});

const formulas = (products: Product[] | null) =>
  products?.map((p) => `${p.formula}(${p.state})`);

describe('predict: single replacement, by the activity series', () => {
  it('lets zinc replace copper', () => {
    const p = predict(['Zn', 'CuSO4']);
    expect(formulas(p.products)).toEqual(['ZnSO4(aq)', 'Cu(s)']);
    expect(p.equation).toBe('Zn(s) + CuSO₄(aq) → ZnSO₄(aq) + Cu(s)');
    expect(p.netIonic).toBe('Zn(s) + Cu²⁺(aq) → Zn²⁺(aq) + Cu(s)');
    expect(p.spectators).toEqual(['SO₄²⁻']);
  });

  it('balances charges that differ', () => {
    const al = predict(['Al', 'CuSO4']);
    expect(formulas(al.products)).toEqual(['Al2(SO4)3(aq)', 'Cu(s)']);
    expect(al.equation).toBe('2Al(s) + 3CuSO₄(aq) → Al₂(SO₄)₃(aq) + 3Cu(s)');
    expect(al.netIonic).toBe('2Al(s) + 3Cu²⁺(aq) → 2Al³⁺(aq) + 3Cu(s)');
    expect(predict(['Cu', 'AgNO3']).netIonic).toBe(
      'Cu(s) + 2Ag⁺(aq) → Cu²⁺(aq) + 2Ag(s)',
    );
  });

  it('frees hydrogen gas from an acid', () => {
    const p = predict(['Zn', 'HCl']);
    expect(formulas(p.products)).toEqual(['ZnCl2(aq)', 'H2(g)']);
    expect(p.netIonic).toBe('Zn(s) + 2H⁺(aq) → Zn²⁺(aq) + H₂(g)');
    expect(p.spectators).toEqual(['Cl⁻']);
  });

  it('says why a less active metal does nothing', () => {
    const copper = predict(['Cu', 'ZnSO4']);
    expect(copper.products).toBeNull();
    expect(copper.reason).toMatch(/Cu is below Zn in the activity series/);
    expect(predict(['Cu', 'HCl']).reason).toMatch(/below hydrogen/);
  });
});

describe('predict: double replacement, by solubility', () => {
  it('finds the precipitate and the spectators', () => {
    const p = predict(['AgNO3', 'NaCl']);
    expect(formulas(p.products)).toEqual(['AgCl(s)', 'NaNO3(aq)']);
    expect(p.netIonic).toBe('Ag⁺(aq) + Cl⁻(aq) → AgCl(s)');
    expect(p.spectators).toEqual(['NO₃⁻', 'Na⁺']);
    expect(p.reason).toMatch(/AgCl is insoluble/);
  });

  it.each([
    [['Pb(NO3)2', 'KI'], 'Pb²⁺(aq) + 2I⁻(aq) → PbI₂(s)'],
    [['BaCl2', 'Na2SO4'], 'Ba²⁺(aq) + SO₄²⁻(aq) → BaSO₄(s)'],
    [['Na3PO4', 'CaCl2'], '3Ca²⁺(aq) + 2PO₄³⁻(aq) → Ca₃(PO₄)₂(s)'],
    [['CuSO4', 'NaOH'], 'Cu²⁺(aq) + 2OH⁻(aq) → Cu(OH)₂(s)'],
    [['HCl', 'NaOH'], 'H⁺(aq) + OH⁻(aq) → H₂O(l)'],
  ] as [[string, string], string][])('%j: %s', (reactants, net) => {
    expect(predict(reactants).netIonic).toBe(net);
  });

  it('makes water from an acid and a base', () => {
    const p = predict(['HCl', 'NaOH']);
    expect(formulas(p.products)).toEqual(['H2O(l)', 'NaCl(aq)']);
    expect(p.equation).toBe('HCl(aq) + NaOH(aq) → H₂O(l) + NaCl(aq)');
  });

  it('says no reaction when every product stays dissolved', () => {
    const p = predict(['NaCl', 'KNO3']);
    expect(p.products).toBeNull();
    expect(p.reason).toMatch(/NaNO₃ and KCl are both soluble/);
  });
});

describe('the complete ionic equation', () => {
  const terms = (list: { text: string; spectator: boolean }[]) =>
    list.map((t) => (t.spectator ? `[${t.text}]` : t.text));

  it('splits dissolved compounds and marks the spectators', () => {
    const { ionic } = predict(['AgNO3', 'NaCl']);
    expect(terms(ionic.left)).toEqual([
      'Ag⁺(aq)',
      '[NO₃⁻(aq)]',
      '[Na⁺(aq)]',
      'Cl⁻(aq)',
    ]);
    expect(terms(ionic.right)).toEqual(['AgCl(s)', '[Na⁺(aq)]', '[NO₃⁻(aq)]']);
  });

  it('keeps coefficients from the balanced equation', () => {
    const { ionic } = predict(['Zn', 'HCl']);
    expect(terms(ionic.left)).toEqual(['Zn(s)', '2H⁺(aq)', '[2Cl⁻(aq)]']);
    expect(terms(ionic.right)).toEqual(['Zn²⁺(aq)', '[2Cl⁻(aq)]', 'H₂(g)']);
  });

  it('is empty when nothing happens', () => {
    expect(predict(['Cu', 'Zn(NO3)2']).ionic).toEqual({ left: [], right: [] });
  });
});

describe('check: grading built products', () => {
  const zn = predict(['Zn', 'CuSO4']);

  it('accepts the right products and states, in any order', () => {
    expect(
      check(zn, [
        { formula: 'Cu', state: 's' },
        { formula: 'ZnSO4', state: 'aq' },
      ]).verdict,
    ).toBe('correct');
  });

  it('notices the right products with a wrong state', () => {
    expect(
      check(zn, [
        { formula: 'ZnSO4', state: 's' },
        { formula: 'Cu', state: 's' },
      ]).verdict,
    ).toBe('wrong-state');
  });

  it('marks wrong products wrong', () => {
    expect(
      check(zn, [
        { formula: 'ZnCu', state: 's' },
        { formula: 'SO4', state: 'aq' },
      ]).verdict,
    ).toBe('wrong-products');
  });

  it('grades No reaction both ways', () => {
    expect(check(zn, 'none').verdict).toBe('missed-reaction');
    expect(check(predict(['Cu', 'ZnSO4']), 'none').verdict).toBe('correct');
    expect(
      check(predict(['Cu', 'ZnSO4']), [{ formula: 'CuSO4', state: 'aq' }])
        .verdict,
    ).toBe('no-reaction');
  });
});

describe('PREDICT_POOL', () => {
  it('holds single and double replacements, some with no reaction', () => {
    const results = PREDICT_POOL.map((r) => predict(r));
    const kinds = new Set(results.map((p) => p.kind));
    expect(kinds).toEqual(new Set(['single', 'double']));
    expect(results.some((p) => p.products === null)).toBe(true);
    expect(results.filter((p) => p.products).length).toBeGreaterThan(20);
  });

  it('only deals reactions the rules can decide, each balanced', () => {
    for (const reactants of PREDICT_POOL) {
      const p = predict(reactants);
      if (p.products) expect(p.equation).toMatch(/→/);
      else expect(p.reason.length).toBeGreaterThan(10);
    }
  });
});

describe('pieces: the chips a student builds products from', () => {
  const names = (ions: { symbol: string; charge: number }[]) =>
    ions.map((i) => `${i.symbol}${i.charge}`);

  it('offers every ion, the ion a free metal forms, and free elements', () => {
    const { ions, wholes } = pieces(['Zn', 'CuSO4']);
    expect(names(ions)).toEqual(['Zn2', 'Cu2', 'SO4-2']);
    expect(wholes).toEqual(['Zn', 'Cu']);
  });

  it('offers H⁺ and hydrogen gas for an acid', () => {
    const { ions, wholes } = pieces(['Mg', 'HCl']);
    expect(names(ions)).toEqual(['Mg2', 'H1', 'Cl-1']);
    expect(wholes).toEqual(['Mg', 'H2']);
  });

  it('offers only ions for two solutions', () => {
    const { ions, wholes } = pieces(['HCl', 'NaOH']);
    expect(names(ions)).toEqual(['H1', 'Cl-1', 'Na1', 'OH-1']);
    expect(wholes).toEqual([]);
  });
});

describe('dealPredict', () => {
  it('never deals the same reactants twice in a row', () => {
    for (let i = 0; i < PREDICT_POOL.length; i += 7) {
      const landing = (i + 0.5) / PREDICT_POOL.length;
      expect(dealPredict(i, () => landing)).not.toBe(i);
    }
  });
});
