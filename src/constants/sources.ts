// Where the app's real-world values come from. Each data module names the
// sources behind its values, and each page lists them in its Sources footer.
// Check a value against its source before adding or changing it.

export interface Source {
  topic: string; // what the app takes from it
  author: string; // people or organisation
  year: number; // published, or last updated for a web page
  title: string;
  publisher: string; // journal, database or website
  url: string; // a DOI where there is one
  accessed?: string; // YYYY-MM-DD, for web pages that can change
}

const WIKIPEDIA = { author: 'Wikipedia contributors', publisher: 'Wikipedia' };

const ALL = {
  electrodePotentials: {
    topic:
      'Standard reduction potentials, E° (25 °C, 1 M); the page credits each value to the CRC Handbook, Atkins or Bard et al.',
    ...WIKIPEDIA,
    year: 2026,
    title: 'Standard electrode potential (data page)',
    url: 'https://en.wikipedia.org/wiki/Standard_electrode_potential_(data_page)',
    accessed: '2026-11-13',
  },
  codata: {
    topic: 'The Faraday constant F and the gas constant R',
    author: 'Tiesinga, E., Mohr, P. J., Newell, D. B. and Taylor, B. N.',
    year: 2021,
    title:
      'CODATA recommended values of the fundamental physical constants: 2018',
    publisher: 'Reviews of Modern Physics 93, 025010',
    url: 'https://doi.org/10.1103/RevModPhys.93.025010',
  },
  ciaawWeights: {
    topic: 'Atomic masses',
    author:
      'IUPAC Commission on Isotopic Abundances and Atomic Weights (CIAAW)',
    year: 2024,
    title: 'Abridged standard atomic weights',
    publisher: 'ciaaw.org',
    url: 'https://www.ciaaw.org/abridged-atomic-weights.htm',
    accessed: '2026-11-13',
  },
  stableIsotopes: {
    topic:
      'Atomic masses in brackets: the mass number of the most stable isotope, for elements with no standard atomic weight',
    ...WIKIPEDIA,
    year: 2026,
    title: 'List of chemical elements',
    url: 'https://en.wikipedia.org/wiki/List_of_chemical_elements',
    accessed: '2026-11-13',
  },
  nistAsd: {
    topic:
      'Electron configurations of the ground-state atoms, H to Ds (Rg to Og are theoretical predictions)',
    author: 'Kramida, A., Ralchenko, Yu., Reader, J. and NIST ASD Team',
    year: 2024,
    title: 'NIST Atomic Spectra Database (version 5.12)',
    publisher: 'National Institute of Standards and Technology',
    url: 'https://doi.org/10.18434/T4W30F',
  },
  paulingEN: {
    topic:
      'Electronegativity (Pauling scale), as tabulated from the CRC Handbook of Chemistry and Physics',
    ...WIKIPEDIA,
    year: 2026,
    title: 'Electronegativities of the elements (data page)',
    url: 'https://en.wikipedia.org/wiki/Electronegativities_of_the_elements_(data_page)',
    accessed: '2026-11-13',
  },
  cordero: {
    topic: 'Covalent radii (single bonds)',
    author: 'Cordero, B., Gómez, V., Platero-Prats, A. E. et al.',
    year: 2008,
    title: 'Covalent radii revisited',
    publisher: 'Dalton Transactions, 2832–2838',
    url: 'https://doi.org/10.1039/B801115J',
  },
  metalloids: {
    topic:
      'Which elements count as metalloids (B, Si, Ge, As, Sb, Te and At; where to draw the line is a convention)',
    ...WIKIPEDIA,
    year: 2026,
    title: 'Metalloid',
    url: 'https://en.wikipedia.org/wiki/Metalloid',
    accessed: '2026-11-13',
  },
  waterData: {
    topic:
      'Water: melting and boiling points, enthalpies of fusion and vaporisation, heat capacities',
    ...WIKIPEDIA,
    year: 2026,
    title: 'Water (data page)',
    url: 'https://en.wikipedia.org/wiki/Water_(data_page)',
    accessed: '2026-11-13',
  },
  ethanolWebBook: {
    topic:
      'Ethanol: melting point, enthalpies of fusion and of vaporisation at the boiling point, liquid heat capacity',
    author: 'Linstrom, P. J. and Mallard, W. G. (eds.)',
    year: 2025,
    title: 'NIST Chemistry WebBook, SRD 69: Ethanol',
    publisher: 'National Institute of Standards and Technology',
    url: 'https://webbook.nist.gov/cgi/cbook.cgi?ID=C64175',
    accessed: '2026-11-13',
  },
  ethanolData: {
    topic:
      'Ethanol: boiling point and vapour heat capacity. Its solid heat capacity is an estimate (the liquid’s value): no measured value could be checked',
    ...WIKIPEDIA,
    year: 2026,
    title: 'Ethanol (data page)',
    url: 'https://en.wikipedia.org/wiki/Ethanol_(data_page)',
    accessed: '2026-11-13',
  },
  mercury: {
    topic:
      'Mercury: melting and boiling points, enthalpies of fusion and vaporisation, liquid heat capacity',
    ...WIKIPEDIA,
    year: 2026,
    title: 'Mercury (element)',
    url: 'https://en.wikipedia.org/wiki/Mercury_(element)',
    accessed: '2026-11-13',
  },
  janafMercury: {
    topic: 'Solid mercury’s heat capacity at its melting point',
    author: 'Chase, M. W.',
    year: 1998,
    title:
      'NIST-JANAF Thermochemical Tables, 4th ed. (Mercury, crystal and liquid)',
    publisher: 'Journal of Physical and Chemical Reference Data, Monograph 9',
    url: 'https://janaf.nist.gov/tables/Hg-001.html',
    accessed: '2026-11-13',
  },
  aceticAcid: {
    topic: 'pKa of acetic acid',
    ...WIKIPEDIA,
    year: 2026,
    title: 'Acetic acid',
    url: 'https://en.wikipedia.org/wiki/Acetic_acid',
    accessed: '2026-11-13',
  },
  phosphoricAcid: {
    topic: 'pKa values of phosphoric acid',
    ...WIKIPEDIA,
    year: 2026,
    title: 'Phosphoric acid',
    url: 'https://en.wikipedia.org/wiki/Phosphoric_acid',
    accessed: '2026-11-13',
  },
  ammonium: {
    topic: 'pKa of the ammonium ion (for ammonia)',
    ...WIKIPEDIA,
    year: 2026,
    title: 'Ammonium',
    url: 'https://en.wikipedia.org/wiki/Ammonium',
    accessed: '2026-11-13',
  },
  indicators: {
    topic: 'Indicator colours and transition ranges',
    ...WIKIPEDIA,
    year: 2026,
    title: 'pH indicator',
    url: 'https://en.wikipedia.org/wiki/PH_indicator',
    accessed: '2026-11-13',
  },
  kw: {
    topic: 'The ion product of water, Kw = 1.0 × 10⁻¹⁴ near 25 °C',
    ...WIKIPEDIA,
    year: 2026,
    title: 'Self-ionization of water',
    url: 'https://en.wikipedia.org/wiki/Self-ionization_of_water',
    accessed: '2026-11-13',
  },
  openstaxIons: {
    topic:
      'Ion charges: common polyatomic ions (Table 2.5) and the 1− and 2− anions of groups 17 and 16 (Figure 2.29)',
    author: 'Flowers, P., Theopold, K., Langley, R. and Robinson, W. R.',
    year: 2019,
    title: 'Chemistry 2e, section 2.6: Molecular and Ionic Compounds',
    publisher: 'OpenStax',
    url: 'https://openstax.org/books/chemistry-2e/pages/2-6-molecular-and-ionic-compounds',
    accessed: '2026-11-16',
  },
  openstaxReactions: {
    topic:
      'Solubility of common ionic compounds in water (Table 4.1) and the common strong acids (Table 4.2)',
    author: 'Flowers, P., Theopold, K., Langley, R. and Robinson, W. R.',
    year: 2019,
    title: 'Chemistry 2e, section 4.2: Classifying Chemical Reactions',
    publisher: 'OpenStax',
    url: 'https://openstax.org/books/chemistry-2e/pages/4-2-classifying-chemical-reactions',
    accessed: '2026-11-16',
  },
  openstaxStrength: {
    topic: 'The common strong acids and strong bases (Figure 14.6)',
    author: 'Flowers, P., Theopold, K., Langley, R. and Robinson, W. R.',
    year: 2019,
    title: 'Chemistry 2e, section 14.3: Relative Strengths of Acids and Bases',
    publisher: 'OpenStax',
    url: 'https://openstax.org/books/chemistry-2e/pages/14-3-relative-strengths-of-acids-and-bases',
    accessed: '2026-11-16',
  },
  cccbdb: {
    topic:
      'Bond angles: water H–O–H 104.4776° (Hoy and Bunker, 1979) and ammonia H–N–H 106.67° (Herzberg, 1966)',
    author: 'NIST',
    year: 2022,
    title:
      'Computational Chemistry Comparison and Benchmark Database, Release 22: experimental geometries',
    publisher: 'NIST Standard Reference Database 101',
    url: 'https://cccbdb.nist.gov/expgeom2x.asp?casno=7732185',
    accessed: '2026-11-16',
  },
} satisfies Record<string, Source>;

export type SourceId = keyof typeof ALL;
export const SOURCES: Record<SourceId, Source> = ALL;
