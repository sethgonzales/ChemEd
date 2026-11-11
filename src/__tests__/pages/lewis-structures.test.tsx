import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LEVELS, MOLECULES } from '~/constants/molecules';
import LewisStructures from '~/pages/lewis-structures';
import { formatFormula, type Molecule } from '~/utils/lewis';

const atom = (symbol: string, index = 0) =>
  screen.getAllByRole('button', { name: new RegExp(`^${symbol} atom:`) })[
    index
  ];

const tool = (name: string | RegExp) =>
  within(screen.getByRole('toolbar', { name: 'Drawing tools' })).getByRole(
    'button',
    { name },
  );

// both modes stay mounted; only the active one is visible
const panel = () => screen.getByRole('tabpanel');

const counter = () => within(panel()).getByTestId('electron-counter');

const drawing = () => screen.getByRole('group', { name: 'Lewis structure' });

/**
 * Drags from one element and drops wherever the pointer lands. jsdom can't
 * hit-test, so the drop target is what elementFromPoint returns.
 */
function drag(from: Element, onto: Element) {
  document.elementFromPoint = jest.fn(() => onto);
  fireEvent.pointerDown(from, { clientX: 10, clientY: 10, button: 0 });
  fireEvent.pointerMove(window, { clientX: 60, clientY: 40 });
  fireEvent.pointerUp(window, { clientX: 60, clientY: 40 });
}

async function checkWork() {
  await userEvent.click(
    screen.getByRole('button', { name: 'Check your work' }),
  );
  return within(panel()).getByTestId('feedback');
}

function renderQuiz() {
  const result = render(<LewisStructures />);
  fireEvent.click(screen.getByRole('tab', { name: 'Quiz' }));
  return result;
}

/** Opens a picker menu and chooses one of its options */
async function choose(picker: RegExp, option: string) {
  await userEvent.click(within(panel()).getByRole('button', { name: picker }));
  await userEvent.click(within(panel()).getByRole('button', { name: option }));
}

async function pick(level: string, moleculeId: string) {
  const m = MOLECULES.find((x) => x.id === moleculeId)!;
  await choose(
    /^Choose a level/,
    `Level ${level}: ${LEVELS[Number(level) as Molecule['level']]}`,
  );
  await choose(
    /^Choose a molecule/,
    `${m.name} (${formatFormula(m.formula, m.charge)})`,
  );
}

describe('Lewis Structures page: quiz', () => {
  it('starts with water on a given skeleton joined by single bonds', () => {
    renderQuiz();
    expect(
      screen.getByRole('heading', { name: 'Water, H₂O' }),
    ).toBeInTheDocument();
    expect(counter()).toHaveTextContent('4 of 8 valence electrons placed');
    expect(screen.getAllByRole('button', { name: /^H atom:/ })).toHaveLength(2);
    expect(
      screen.getAllByRole('button', { name: 'O–H single bond' }),
    ).toHaveLength(2);
  });

  it('has a ChemDraw-style toolbar with one tool active at a time', async () => {
    renderQuiz();
    for (const name of [
      'Select',
      'Single bond',
      'Double bond',
      'Triple bond',
      'Lone pair',
      'Unpaired electron',
      'Eraser',
    ]) {
      expect(tool(name)).toBeInTheDocument();
    }
    expect(tool('Lone pair')).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(tool('Eraser'));
    expect(tool('Eraser')).toHaveAttribute('aria-pressed', 'true');
    expect(tool('Lone pair')).toHaveAttribute('aria-pressed', 'false');
  });

  describe('tapping with a tool', () => {
    it('adds a lone pair to an atom', async () => {
      renderQuiz();
      await userEvent.click(atom('O'));
      expect(counter()).toHaveTextContent('6 of 8');
      expect(atom('O')).toHaveAccessibleName(/1 lone pair/);
    });

    it('sets a bond to the bond tool’s order', async () => {
      renderQuiz();
      await userEvent.click(tool('Triple bond'));
      await userEvent.click(
        screen.getAllByRole('button', { name: 'O–H single bond' })[0],
      );
      expect(
        screen.getByRole('button', { name: 'O–H triple bond' }),
      ).toBeInTheDocument();
    });

    it('adds an unpaired electron', async () => {
      renderQuiz();
      await userEvent.click(tool('Unpaired electron'));
      await userEvent.click(atom('O'));
      expect(counter()).toHaveTextContent('5 of 8');
      expect(atom('O')).toHaveAccessibleName(/1 unpaired electron/);
    });

    it('erases lone pairs, bonds and atoms', async () => {
      renderQuiz();
      await userEvent.click(atom('O'));
      await userEvent.click(tool('Eraser'));

      await userEvent.click(
        screen.getByRole('button', { name: 'Lone pair on O' }),
      );
      expect(counter()).toHaveTextContent('4 of 8');

      await userEvent.click(
        screen.getAllByRole('button', { name: 'O–H single bond' })[0],
      );
      expect(
        screen.getAllByRole('button', { name: 'O–H single bond' }),
      ).toHaveLength(1);

      await userEvent.click(atom('H'));
      expect(screen.getAllByRole('button', { name: /^H atom:/ })).toHaveLength(
        1,
      );
    });

    it('works by keyboard', async () => {
      renderQuiz();
      atom('O').focus();
      await userEvent.keyboard('{Enter}');
      expect(counter()).toHaveTextContent('6 of 8');
    });
  });

  describe('dragging from the toolbar', () => {
    it('drops a lone pair onto an atom', () => {
      renderQuiz();
      drag(tool('Lone pair'), atom('O'));
      expect(counter()).toHaveTextContent('6 of 8');
    });

    it('drops a bond order onto a bond', () => {
      renderQuiz();
      drag(
        tool('Double bond'),
        screen.getAllByRole('button', { name: 'O–H single bond' })[0],
      );
      expect(
        screen.getByRole('button', { name: 'O–H double bond' }),
      ).toBeInTheDocument();
    });

    it('doesn’t change the active tool', () => {
      renderQuiz();
      drag(tool('Unpaired electron'), atom('O'));
      expect(tool('Lone pair')).toHaveAttribute('aria-pressed', 'true');
    });

    it('does nothing when dropped on nothing', () => {
      renderQuiz();
      drag(tool('Lone pair'), document.body);
      expect(counter()).toHaveTextContent('4 of 8');
    });
  });

  describe('dragging on the drawing with Select', () => {
    it('moves a lone pair to another atom', async () => {
      renderQuiz();
      await userEvent.click(atom('O'));
      await userEvent.click(tool('Select'));
      drag(screen.getByRole('button', { name: 'Lone pair on O' }), atom('H'));
      expect(atom('O')).toHaveAccessibleName(/0 lone pairs/);
      expect(atom('H')).toHaveAccessibleName(/1 lone pair/);
    });

    it('removes a lone pair dragged off into empty space', async () => {
      renderQuiz();
      await userEvent.click(atom('O'));
      await userEvent.click(tool('Select'));
      drag(screen.getByRole('button', { name: 'Lone pair on O' }), drawing());
      expect(counter()).toHaveTextContent('4 of 8');
    });

    it('moves an atom to where it is dropped', async () => {
      renderQuiz();
      await userEvent.click(tool('Select'));
      const svg = drawing();
      jest.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 400,
        height: 300,
      } as DOMRect);
      const before = atom('H').querySelector('circle')!.getAttribute('cx');
      drag(atom('H'), svg);
      expect(atom('H').querySelector('circle')!.getAttribute('cx')).not.toBe(
        before,
      );
    });
  });

  describe('starting from an empty canvas', () => {
    async function emptyCanvas() {
      renderQuiz();
      await userEvent.click(
        screen.getByRole('button', { name: 'Empty canvas' }),
      );
    }

    it('has no atoms and an element for each atom in the formula', async () => {
      await emptyCanvas();
      expect(screen.queryByRole('button', { name: / atom:/ })).toBeNull();
      expect(tool('Add O (1 in H₂O)')).toBeInTheDocument();
      expect(tool('Add H (2 in H₂O)')).toBeInTheDocument();
    });

    it('places atoms dropped on the canvas and bonds those dropped on an atom', async () => {
      await emptyCanvas();
      drag(tool(/^Add O/), drawing());
      expect(atom('O')).toBeInTheDocument();
      drag(tool(/^Add H/), atom('O'));
      expect(
        screen.getByRole('button', { name: 'O–H single bond' }),
      ).toBeInTheDocument();
    });

    it('keeps placing an element as often as you like', async () => {
      await emptyCanvas();
      drag(tool(/^Add O/), drawing());
      await userEvent.click(tool(/^Add H/));
      for (let i = 0; i < 3; i++) await userEvent.click(atom('O'));
      expect(
        screen.getAllByRole('button', { name: 'O–H single bond' }),
      ).toHaveLength(3);
      // the formula's count is guidance, not a limit
      expect(tool('Add H (2 in H₂O)')).toBeEnabled();
    });

    it('draws a bond by dragging from one atom to another', async () => {
      await emptyCanvas();
      drag(tool(/^Add O/), drawing());
      drag(tool(/^Add H/), drawing());
      await userEvent.click(tool('Single bond'));
      drag(atom('O'), atom('H'));
      expect(
        screen.getByRole('button', { name: 'O–H single bond' }),
      ).toBeInTheDocument();
    });

    it('builds water from scratch and checks it', async () => {
      await emptyCanvas();
      drag(tool(/^Add O/), drawing());
      drag(tool(/^Add H/), atom('O'));
      drag(tool(/^Add H/), atom('O'));
      drag(tool('Lone pair'), atom('O'));
      drag(tool('Lone pair'), atom('O'));
      expect(await checkWork()).toHaveTextContent('Correct!');
    });

    it('points out a wrong skeleton', async () => {
      await emptyCanvas();
      // H–H–O chain: hydrogen in the middle
      drag(tool(/^Add H/), drawing());
      drag(tool(/^Add H/), atom('H'));
      drag(tool(/^Add O/), atom('H', 1));
      const feedback = await checkWork();
      expect(within(feedback).getByText(/Check your skeleton/)).toBeVisible();
    });
  });

  describe('checking your work', () => {
    it('explains what is wrong when checked too early', async () => {
      renderQuiz();
      const feedback = await checkWork();
      expect(feedback).toHaveTextContent('Not yet');
      expect(feedback).toHaveTextContent(
        "You've placed 4 of 8 valence electrons.",
      );
      expect(feedback).toHaveTextContent('O has 4 electrons around it.');
    });

    it('explains a flagged atom when it is hovered', async () => {
      renderQuiz();
      await checkWork();
      fireEvent.pointerEnter(atom('O'));
      expect(screen.getByRole('tooltip')).toHaveTextContent(
        'O has 4 electrons around it. It needs 8.',
      );
    });

    it('says correct for a finished structure', async () => {
      renderQuiz();
      await userEvent.click(atom('O'));
      await userEvent.click(atom('O'));
      expect(await checkWork()).toHaveTextContent('Correct!');
    });

    it('clears feedback once the structure changes', async () => {
      renderQuiz();
      await checkWork();
      await userEvent.click(atom('O'));
      expect(within(panel()).queryByTestId('feedback')).not.toBeInTheDocument();
    });

    it('mentions resonance for a correct resonance structure', async () => {
      renderQuiz();
      await pick('4', 'nitrate');
      // bonds and atoms render in skeleton order, so the first N–O bond
      // belongs to the first oxygen
      await userEvent.click(tool('Double bond'));
      await userEvent.click(
        screen.getAllByRole('button', { name: 'N–O single bond' })[0],
      );
      await userEvent.click(tool('Lone pair'));
      const oxygens = screen.getAllByRole('button', { name: /^O atom:/ });
      for (const [i, o] of oxygens.entries()) {
        for (let k = 0; k < (i === 0 ? 2 : 3); k++) await userEvent.click(o);
      }
      // formal charges: N⁺ and the two single-bonded O⁻, then ion brackets
      await userEvent.click(tool('Positive charge'));
      await userEvent.click(atom('N'));
      await userEvent.click(tool('Negative charge'));
      await userEvent.click(atom('O', 1));
      await userEvent.click(atom('O', 2));
      await userEvent.click(tool('Ion brackets'));
      await userEvent.click(drawing());
      await userEvent.click(tool('Negative charge'));
      await userEvent.click(
        screen.getByRole('button', { name: /^Ion brackets, charge/ }),
      );
      const feedback = await checkWork();
      expect(feedback).toHaveTextContent('Correct!');
      expect(feedback).toHaveTextContent('one of 3 resonance structures');
    });
  });

  it('undoes the last change', async () => {
    renderQuiz();
    await userEvent.click(atom('O'));
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(counter()).toHaveTextContent('4 of 8');
  });

  it('switches molecules from the level and molecule pickers', async () => {
    renderQuiz();
    await pick('4', 'nitrate');
    expect(
      screen.getByRole('heading', { name: 'Nitrate ion, NO₃⁻' }),
    ).toBeInTheDocument();
    expect(counter()).toHaveTextContent('6 of 24');
  });

  it('shows formal charges only once every electron is placed', async () => {
    renderQuiz();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Show hints' }));
    // bare skeleton: O would read +4, which means nothing yet
    expect(drawing().textContent).not.toContain('+4');
    await pick('3', 'ammonium');
    // NH₄⁺'s skeleton already uses all 8 electrons
    expect(drawing().textContent).toContain('+1');
  });

  it('can draw lone pairs as bars', async () => {
    const { container } = renderQuiz();
    await userEvent.click(atom('O'));
    expect(
      container.querySelectorAll('[data-pair] circle:not(.hit)'),
    ).toHaveLength(2);

    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Lone pairs as bars' }),
    );
    expect(
      container.querySelectorAll('[data-pair] circle:not(.hit)'),
    ).toHaveLength(0);
    expect(container.querySelectorAll('[data-pair] line')).toHaveLength(1);
  });

  describe('charges, δ marks and ion brackets', () => {
    it('has mark tools in the toolbar', () => {
      renderQuiz();
      for (const name of [
        'Positive charge',
        'Negative charge',
        'Partial charge (δ+/δ−)',
        'Ion brackets',
      ]) {
        expect(tool(name)).toBeInTheDocument();
      }
    });

    it('writes charges on atoms by tap or drag, and erases them', async () => {
      renderQuiz();
      await pick('3', 'ammonium');
      await userEvent.click(tool('Positive charge'));
      await userEvent.click(atom('N'));
      expect(
        screen.getByRole('button', { name: 'Marks on N: charge +' }),
      ).toBeInTheDocument();

      drag(tool('Positive charge'), atom('N'));
      expect(
        screen.getByRole('button', { name: 'Marks on N: charge 2+' }),
      ).toBeInTheDocument();

      await userEvent.click(tool('Eraser'));
      await userEvent.click(
        screen.getByRole('button', { name: /^Marks on N/ }),
      );
      expect(screen.queryByRole('button', { name: /^Marks on/ })).toBeNull();
    });

    it('asks for formal charges and brackets on an ion', async () => {
      renderQuiz();
      await pick('3', 'ammonium');
      const feedback = await checkWork();
      expect(feedback).toHaveTextContent('Almost');
      expect(feedback).toHaveTextContent("Mark N's formal charge (+1).");
      expect(feedback).toHaveTextContent(
        'Draw a polyatomic ion in brackets with its overall charge (+).',
      );
    });

    it('marks an ion correct once its charges and brackets are right', async () => {
      renderQuiz();
      await pick('3', 'ammonium');
      await userEvent.click(tool('Positive charge'));
      await userEvent.click(atom('N'));
      await userEvent.click(tool('Ion brackets'));
      await userEvent.click(drawing());
      await userEvent.click(tool('Positive charge'));
      await userEvent.click(
        screen.getByRole('button', { name: 'Ion brackets, charge none' }),
      );
      expect(
        screen.getByRole('button', { name: 'Ion brackets, charge +' }),
      ).toBeInTheDocument();
      expect(await checkWork()).toHaveTextContent('Correct!');
    });

    it('grades δ marks', async () => {
      renderQuiz();
      await userEvent.click(atom('O'));
      await userEvent.click(atom('O'));
      await userEvent.click(tool('Partial charge (δ+/δ−)'));
      await userEvent.click(atom('O')); // δ+ on oxygen: backwards
      expect(
        screen.getByRole('button', { name: 'Marks on O: δ+' }),
      ).toBeInTheDocument();
      expect(await checkWork()).toHaveTextContent(
        'O is more electronegative than H, so it gets δ−.',
      );

      await userEvent.click(atom('O')); // now δ−
      for (const h of screen.getAllByRole('button', { name: /^H atom:/ })) {
        await userEvent.click(h); // δ+
      }
      expect(await checkWork()).toHaveTextContent('Correct!');
    });
  });

  describe('hints', () => {
    it('are off by default, last in the settings, and can be shown', async () => {
      renderQuiz();
      await pick('5', 'sulfate');
      const settings = within(panel()).getAllByRole('checkbox');
      const hints = settings[settings.length - 1];
      expect(hints).toHaveAccessibleName('Show hints');
      expect(hints).not.toBeChecked();
      expect(drawing().textContent).not.toContain('✓');
      expect(drawing().textContent).not.toContain('!');
      expect(atom('S')).toHaveAccessibleName('S atom: 0 lone pairs');

      await userEvent.click(hints);
      expect(drawing().textContent).toContain('✓');
      expect(atom('S')).toHaveAccessibleName(/electrons, formal charge/);
    });
  });

  describe('snapping and Clean Up', () => {
    // O sits at the origin; H atoms are one bond length (64px) away
    const distanceFromO = (h: Element) => {
      const o = atom('O').querySelector('circle')!;
      const c = h.querySelector('circle')!;
      return Math.hypot(
        Number(c.getAttribute('cx')) - Number(o.getAttribute('cx')),
        Number(c.getAttribute('cy')) - Number(o.getAttribute('cy')),
      );
    };

    function layOut() {
      jest.spyOn(drawing(), 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 400,
        height: 300,
      } as DOMRect);
    }

    it('snaps a moved atom to a bond length from its neighbour', async () => {
      renderQuiz();
      await userEvent.click(tool('Select'));
      layOut();
      drag(atom('H'), drawing());
      expect(distanceFromO(atom('H'))).toBeCloseTo(64);
    });

    it('can be switched off', async () => {
      renderQuiz();
      const snap = screen.getByRole('checkbox', {
        name: 'Snap to bond angles',
      });
      expect(snap).toBeChecked();
      await userEvent.click(snap);
      await userEvent.click(tool('Select'));
      layOut();
      drag(atom('H'), drawing());
      expect(distanceFromO(atom('H'))).not.toBeCloseTo(64);
    });

    it('tidies the drawing with Clean Up, which Undo reverses', async () => {
      renderQuiz();
      await userEvent.click(
        screen.getByRole('checkbox', { name: 'Snap to bond angles' }),
      );
      await userEvent.click(tool('Select'));
      layOut();
      drag(atom('H'), drawing());
      const moved = distanceFromO(atom('H'));

      await userEvent.click(screen.getByRole('button', { name: 'Clean Up' }));
      expect(distanceFromO(atom('H'))).toBeCloseTo(64);

      await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
      expect(distanceFromO(atom('H'))).toBeCloseTo(moved);
    });
  });

  describe('resonance forms', () => {
    const tab = (name: string) =>
      within(
        screen.getByRole('tablist', { name: 'Resonance forms' }),
      ).getByRole('tab', { name });
    const ooBonds = () => screen.getAllByRole('button', { name: /^O–O/ });

    /** Ozone form 1: O=O–O⁻ with the central O⁺ (atom 0 central, 1 and 2 outer) */
    async function ozoneFormOne() {
      await pick('4', 'ozone');
      await userEvent.click(tool('Double bond'));
      await userEvent.click(ooBonds()[0]);
      await userEvent.click(tool('Lone pair'));
      for (const [i, pairs] of [1, 2, 3].entries()) {
        for (let k = 0; k < pairs; k++) await userEvent.click(atom('O', i));
      }
      await userEvent.click(tool('Positive charge'));
      await userEvent.click(atom('O', 0));
      await userEvent.click(tool('Negative charge'));
      await userEvent.click(atom('O', 2));
    }

    /** From a copy of form 1, makes form 2: ⁻O–O=O */
    async function ozoneFormTwo(container: HTMLElement) {
      await userEvent.click(
        screen.getByRole('button', { name: 'Add resonance form' }),
      );
      await userEvent.click(tool('Single bond'));
      await userEvent.click(ooBonds()[0]);
      await userEvent.click(tool('Double bond'));
      await userEvent.click(ooBonds()[1]);
      // move a lone pair from O2 to O1, and the negative charge with it
      await userEvent.click(tool('Select'));
      drag(container.querySelector('[data-pair="2"]')!, atom('O', 1));
      await userEvent.click(tool('Eraser'));
      await userEvent.click(container.querySelector('[data-mark="2"]')!);
      await userEvent.click(tool('Negative charge'));
      await userEvent.click(atom('O', 1));
    }

    it('starts with one form and adds, switches and removes forms', async () => {
      renderQuiz();
      expect(tab('Form 1')).toHaveAttribute('aria-selected', 'true');

      await userEvent.click(
        screen.getByRole('button', { name: 'Add resonance form' }),
      );
      expect(tab('Form 2')).toHaveAttribute('aria-selected', 'true');

      await userEvent.click(tab('Form 1'));
      expect(tab('Form 1')).toHaveAttribute('aria-selected', 'true');

      await userEvent.click(
        screen.getByRole('button', { name: 'Remove form' }),
      );
      expect(screen.queryByRole('tab', { name: 'Form 2' })).toBeNull();
      expect(
        screen.getByRole('button', { name: 'Remove form' }),
      ).toBeDisabled();
    });

    it('keeps each form’s edits separate', async () => {
      renderQuiz();
      await userEvent.click(
        screen.getByRole('button', { name: 'Add resonance form' }),
      );
      await userEvent.click(atom('O'));
      expect(counter()).toHaveTextContent('6 of 8');
      await userEvent.click(tab('Form 1'));
      expect(counter()).toHaveTextContent('4 of 8');
    });

    it('draws a curved arrow by dragging, and erases it', async () => {
      const { container } = renderQuiz();
      await pick('4', 'ozone');
      await userEvent.click(atom('O', 2));
      await userEvent.click(tool('Curved arrow'));
      drag(container.querySelector('[data-pair="2"]')!, ooBonds()[1]);
      const arrow = screen.getByRole('button', {
        name: 'Curved arrow from lone pair on O to O–O bond',
      });
      await userEvent.click(tool('Eraser'));
      await userEvent.click(arrow);
      expect(
        screen.queryByRole('button', { name: /^Curved arrow from/ }),
      ).toBeNull();
    });

    it('draws a curved arrow with two taps', async () => {
      renderQuiz();
      await pick('4', 'ozone');
      await userEvent.click(tool('Curved arrow'));
      await userEvent.click(ooBonds()[0]);
      expect(
        screen.getByText('Now tap where the electrons go.'),
      ).toBeInTheDocument();
      await userEvent.click(atom('O', 1));
      expect(
        screen.getByRole('button', { name: 'Curved arrow from O–O bond to O' }),
      ).toBeInTheDocument();
    });

    it('grades a full set of resonance forms with arrows', async () => {
      const { container } = renderQuiz();
      await ozoneFormOne();
      // arrows on form 1: O2's lone pair forms a π bond; O0=O1's π bond moves to O1
      await userEvent.click(tool('Curved arrow'));
      drag(container.querySelector('[data-pair="2"]')!, ooBonds()[1]);
      drag(ooBonds()[0], atom('O', 1));
      await ozoneFormTwo(container);
      expect(await checkWork()).toHaveTextContent(
        'Correct! All 2 resonance structures found.',
      );
    });

    it('says when arrows don’t lead to the next form', async () => {
      const { container } = renderQuiz();
      await ozoneFormOne();
      await userEvent.click(tool('Curved arrow'));
      drag(container.querySelector('[data-pair="2"]')!, ooBonds()[1]);
      await ozoneFormTwo(container);
      expect(await checkWork()).toHaveTextContent(
        "Your arrows on form 1 don't lead to form 2.",
      );
    });

    it('grades every form when there are several', async () => {
      renderQuiz();
      await pick('4', 'nitrate');
      await userEvent.click(
        screen.getByRole('button', { name: 'Add resonance form' }),
      );
      const feedback = await checkWork();
      expect(feedback).toHaveTextContent(/Form 1: /);
    });
  });
});

describe('Lewis Structures page: modes', () => {
  it('starts in Draw, with Quiz next to it', () => {
    render(<LewisStructures />);
    expect(screen.getByRole('tab', { name: 'Draw' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      screen.queryByRole('button', { name: /^Choose a level/ }),
    ).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Quiz' }));
    expect(
      screen.getByRole('button', { name: /^Choose a level/ }),
    ).toBeInTheDocument();
  });

  it('keeps each mode’s drawing when switching between them', () => {
    render(<LewisStructures />);
    drag(tool('Add O'), drawing());
    fireEvent.click(screen.getByRole('tab', { name: 'Quiz' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Draw' }));
    expect(atom('O')).toBeInTheDocument();
  });
});

describe('Lewis Structures page: draw', () => {
  it('has the common elements in the toolbar, without limits', () => {
    render(<LewisStructures />);
    for (const symbol of ['H', 'C', 'N', 'O', 'F', 'P', 'S', 'Cl', 'Br', 'I']) {
      expect(tool(`Add ${symbol}`)).toBeEnabled();
    }
    expect(tool('Add C')).toHaveAttribute('aria-pressed', 'true');
  });

  it('adds other elements from the element picker', async () => {
    render(<LewisStructures />);
    await userEvent.click(tool('More elements'));
    const dialog = screen.getByRole('dialog', { name: 'Choose an element' });
    // only elements the builder can check are offered
    expect(within(dialog).queryByRole('button', { name: /Iron/ })).toBeNull();
    await userEvent.click(
      within(dialog).getByRole('button', { name: /Xenon/ }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(tool('Add Xe')).toHaveAttribute('aria-pressed', 'true');
  });

  it('builds and checks a structure with no target molecule', async () => {
    render(<LewisStructures />);
    drag(tool('Add O'), drawing());
    drag(tool('Add H'), atom('O'));
    drag(tool('Add H'), atom('O'));
    drag(tool('Lone pair'), atom('O'));
    drag(tool('Lone pair'), atom('O'));
    expect(counter()).toHaveTextContent('8 valence electrons');
    expect(counter()).toHaveTextContent('H₂O');
    expect(await checkWork()).toHaveTextContent(
      'Looks good! Every atom has a full shell and the charges are marked.',
    );
  });

  it('explains what’s wrong with a drawing', async () => {
    render(<LewisStructures />);
    drag(tool('Add O'), drawing());
    expect(await checkWork()).toHaveTextContent(
      'O has 0 electrons around it. It needs 8.',
    );
  });

  it('starts over with Reset', async () => {
    render(<LewisStructures />);
    drag(tool('Add O'), drawing());
    await userEvent.click(
      within(panel()).getByRole('button', { name: 'Reset' }),
    );
    expect(screen.queryByRole('button', { name: / atom:/ })).toBeNull();
  });
});

describe('Lewis Structures page: drawing area', () => {
  it('fills the whole drawing panel', () => {
    render(<LewisStructures />);
    expect(drawing()).toHaveAttribute('width', '100%');
    expect(drawing()).toHaveAttribute('height', '100%');
  });

  it('turns the selected tool into the cursor', async () => {
    render(<LewisStructures />);
    // Draw starts with carbon
    expect(drawing().style.cursor).toMatch(/^url\("data:image\/svg\+xml/);
    expect(decodeURIComponent(drawing().style.cursor)).toContain('>C<');

    await userEvent.click(tool('Lone pair'));
    expect(drawing().style.cursor).toMatch(/^url\(/);

    await userEvent.click(tool('Select'));
    expect(drawing().style.cursor).toBe('default');
  });

  it('places an atom wherever the drawing is clicked, again and again', async () => {
    render(<LewisStructures />);
    for (let i = 0; i < 3; i++) await userEvent.click(drawing());
    expect(screen.getAllByRole('button', { name: /^C atom:/ })).toHaveLength(3);
  });
});

describe('Lewis Structures page: bonds as connectors', () => {
  const openEnds = () =>
    screen.queryAllByRole('button', { name: 'Open bond end' });

  it('places a bond with two open ends on empty canvas, and no atoms', async () => {
    render(<LewisStructures />);
    await userEvent.click(tool('Double bond'));
    await userEvent.click(drawing());
    expect(screen.queryAllByRole('button', { name: / atom:/ })).toHaveLength(0);
    expect(openEnds()).toHaveLength(2);
    expect(
      screen.getByRole('button', { name: 'open end–open end double bond' }),
    ).toBeInTheDocument();
  });

  it('builds methane: C, four bonds out of it, then H on each open end', async () => {
    render(<LewisStructures />);
    await userEvent.click(drawing()); // C
    await userEvent.click(tool('Single bond'));
    for (let i = 0; i < 4; i++) await userEvent.click(atom('C'));
    expect(openEnds()).toHaveLength(4);

    await userEvent.click(tool('Add H'));
    while (openEnds().length) await userEvent.click(openEnds()[0]);
    expect(
      screen.getAllByRole('button', { name: 'C–H single bond' }),
    ).toHaveLength(4);
    expect(await checkWork()).toHaveTextContent('Looks good!');
  });

  it('fills an open end with an element dragged onto it', () => {
    render(<LewisStructures />);
    fireEvent.click(tool('Single bond'));
    fireEvent.click(drawing());
    drag(tool('Add O'), openEnds()[0]);
    expect(atom('O')).toBeInTheDocument();
    expect(openEnds()).toHaveLength(1);
  });

  it('asks for every open end to be filled when checking', async () => {
    render(<LewisStructures />);
    await userEvent.click(tool('Single bond'));
    await userEvent.click(drawing());
    expect(await checkWork()).toHaveTextContent(
      'Every bond end needs an atom. Drop an element onto each open end.',
    );
  });
});

describe('Lewis Structures page: draw counter', () => {
  it('shows the formula, and the charge only once every shell is full', async () => {
    render(<LewisStructures />);
    await userEvent.click(drawing()); // C
    await userEvent.click(tool('Single bond'));
    await userEvent.click(atom('C'));
    expect(counter()).toHaveTextContent('2 valence electrons placed · C');
    expect(counter()).not.toHaveTextContent('+');
  });

  it('shows the net charge of a complete ion', async () => {
    render(<LewisStructures />);
    // OH⁻: O with three lone pairs bonded to H
    await userEvent.click(tool('Add O'));
    await userEvent.click(drawing());
    await userEvent.click(tool('Add H'));
    await userEvent.click(atom('O'));
    await userEvent.click(tool('Lone pair'));
    for (let i = 0; i < 3; i++) await userEvent.click(atom('O'));
    expect(counter()).toHaveTextContent('8 valence electrons placed · HO⁻');
  });
});

describe('Lewis Structures page: quiz pickers', () => {
  it('uses the app’s own dropdown menus, not native selects', async () => {
    renderQuiz();
    expect(screen.queryByRole('combobox')).toBeNull();
    const level = within(panel()).getByRole('button', {
      name: 'Choose a level (now Level 1: Single bonds)',
    });
    expect(level).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(level);
    const current = within(panel()).getByRole('button', {
      name: 'Level 1: Single bonds',
    });
    expect(current).toHaveAttribute('aria-current', 'true');
  });

  it('shows the molecules of the chosen level', async () => {
    renderQuiz();
    await pick('5', 'xenon-tetrafluoride');
    expect(
      within(panel()).getByRole('button', {
        name: 'Choose a molecule (now Xenon tetrafluoride, XeF₄)',
      }),
    ).toBeInTheDocument();
  });
});

describe('Lewis Structures page: undo and redo', () => {
  it('redoes what was undone with the Redo button', async () => {
    render(<LewisStructures />);
    await userEvent.click(drawing());
    const undo = within(panel()).getByRole('button', { name: 'Undo' });
    const redo = within(panel()).getByRole('button', { name: 'Redo' });
    expect(redo).toBeDisabled();
    await userEvent.click(undo);
    expect(screen.queryByRole('button', { name: /^C atom:/ })).toBeNull();
    await userEvent.click(redo);
    expect(atom('C')).toBeInTheDocument();
  });

  it('undoes and redoes with the keyboard', async () => {
    render(<LewisStructures />);
    await userEvent.click(drawing());
    await userEvent.keyboard('{Control>}z{/Control}');
    expect(screen.queryByRole('button', { name: /^C atom:/ })).toBeNull();
    await userEvent.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');
    expect(atom('C')).toBeInTheDocument();
    await userEvent.keyboard('{Meta>}z{/Meta}');
    expect(screen.queryByRole('button', { name: /^C atom:/ })).toBeNull();
    await userEvent.keyboard('{Control>}y{/Control}');
    expect(atom('C')).toBeInTheDocument();
  });

  it('only the visible mode responds to shortcuts', async () => {
    render(<LewisStructures />);
    fireEvent.click(screen.getByRole('tab', { name: 'Quiz' }));
    await userEvent.click(atom('O')); // lone pair in the quiz
    fireEvent.click(screen.getByRole('tab', { name: 'Draw' }));
    await userEvent.keyboard('{Control>}z{/Control}');
    fireEvent.click(screen.getByRole('tab', { name: 'Quiz' }));
    expect(counter()).toHaveTextContent('6 of 8');
  });
});
