import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LewisStructures from '~/pages/lewis-structures';

const atom = (symbol: string, index = 0) =>
  screen.getAllByRole('button', { name: new RegExp(`^${symbol} atom:`) })[
    index
  ];

const tool = (name: string | RegExp) =>
  within(screen.getByRole('toolbar', { name: 'Drawing tools' })).getByRole(
    'button',
    { name },
  );

const counter = () => screen.getByTestId('electron-counter');

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
  return screen.getByTestId('feedback');
}

async function pick(level: string, molecule: string) {
  await userEvent.selectOptions(
    screen.getByRole('combobox', { name: 'Level' }),
    level,
  );
  await userEvent.selectOptions(
    screen.getByRole('combobox', { name: 'Molecule' }),
    molecule,
  );
}

describe('Lewis Structures page', () => {
  it('starts with water on a given skeleton joined by single bonds', () => {
    render(<LewisStructures />);
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
    render(<LewisStructures />);
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
      render(<LewisStructures />);
      await userEvent.click(atom('O'));
      expect(counter()).toHaveTextContent('6 of 8');
      expect(atom('O')).toHaveAccessibleName(/1 lone pair/);
    });

    it('sets a bond to the bond tool’s order', async () => {
      render(<LewisStructures />);
      await userEvent.click(tool('Triple bond'));
      await userEvent.click(
        screen.getAllByRole('button', { name: 'O–H single bond' })[0],
      );
      expect(
        screen.getByRole('button', { name: 'O–H triple bond' }),
      ).toBeInTheDocument();
    });

    it('adds an unpaired electron', async () => {
      render(<LewisStructures />);
      await userEvent.click(tool('Unpaired electron'));
      await userEvent.click(atom('O'));
      expect(counter()).toHaveTextContent('5 of 8');
      expect(atom('O')).toHaveAccessibleName(/1 unpaired electron/);
    });

    it('erases lone pairs, bonds and atoms', async () => {
      render(<LewisStructures />);
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
      render(<LewisStructures />);
      atom('O').focus();
      await userEvent.keyboard('{Enter}');
      expect(counter()).toHaveTextContent('6 of 8');
    });
  });

  describe('dragging from the toolbar', () => {
    it('drops a lone pair onto an atom', () => {
      render(<LewisStructures />);
      drag(tool('Lone pair'), atom('O'));
      expect(counter()).toHaveTextContent('6 of 8');
    });

    it('drops a bond order onto a bond', () => {
      render(<LewisStructures />);
      drag(
        tool('Double bond'),
        screen.getAllByRole('button', { name: 'O–H single bond' })[0],
      );
      expect(
        screen.getByRole('button', { name: 'O–H double bond' }),
      ).toBeInTheDocument();
    });

    it('doesn’t change the active tool', () => {
      render(<LewisStructures />);
      drag(tool('Unpaired electron'), atom('O'));
      expect(tool('Lone pair')).toHaveAttribute('aria-pressed', 'true');
    });

    it('does nothing when dropped on nothing', () => {
      render(<LewisStructures />);
      drag(tool('Lone pair'), document.body);
      expect(counter()).toHaveTextContent('4 of 8');
    });
  });

  describe('dragging on the drawing with Select', () => {
    it('moves a lone pair to another atom', async () => {
      render(<LewisStructures />);
      await userEvent.click(atom('O'));
      await userEvent.click(tool('Select'));
      drag(screen.getByRole('button', { name: 'Lone pair on O' }), atom('H'));
      expect(atom('O')).toHaveAccessibleName(/0 lone pairs/);
      expect(atom('H')).toHaveAccessibleName(/1 lone pair/);
    });

    it('removes a lone pair dragged off into empty space', async () => {
      render(<LewisStructures />);
      await userEvent.click(atom('O'));
      await userEvent.click(tool('Select'));
      drag(screen.getByRole('button', { name: 'Lone pair on O' }), drawing());
      expect(counter()).toHaveTextContent('4 of 8');
    });

    it('moves an atom to where it is dropped', async () => {
      render(<LewisStructures />);
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
      render(<LewisStructures />);
      await userEvent.click(
        screen.getByRole('button', { name: 'Empty canvas' }),
      );
    }

    it('has no atoms and an element for each atom in the formula', async () => {
      await emptyCanvas();
      expect(screen.queryByRole('button', { name: / atom:/ })).toBeNull();
      expect(tool('Add O (1 left)')).toBeInTheDocument();
      expect(tool('Add H (2 left)')).toBeInTheDocument();
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

    it('attaches an element tapped onto an atom, and runs out', async () => {
      await emptyCanvas();
      drag(tool(/^Add O/), drawing());
      await userEvent.click(tool(/^Add H/));
      await userEvent.click(atom('O'));
      await userEvent.click(atom('O'));
      expect(
        screen.getAllByRole('button', { name: 'O–H single bond' }),
      ).toHaveLength(2);
      expect(tool('Add H (0 left)')).toBeDisabled();
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
      render(<LewisStructures />);
      const feedback = await checkWork();
      expect(feedback).toHaveTextContent('Not yet');
      expect(feedback).toHaveTextContent(
        "You've placed 4 of 8 valence electrons.",
      );
      expect(feedback).toHaveTextContent('O has 4 electrons around it.');
    });

    it('says correct for a finished structure', async () => {
      render(<LewisStructures />);
      await userEvent.click(atom('O'));
      await userEvent.click(atom('O'));
      expect(await checkWork()).toHaveTextContent('Correct!');
    });

    it('clears feedback once the structure changes', async () => {
      render(<LewisStructures />);
      await checkWork();
      await userEvent.click(atom('O'));
      expect(screen.queryByTestId('feedback')).not.toBeInTheDocument();
    });

    it('mentions resonance for a correct resonance structure', async () => {
      render(<LewisStructures />);
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
    render(<LewisStructures />);
    await userEvent.click(atom('O'));
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(counter()).toHaveTextContent('4 of 8');
  });

  it('switches molecules from the level and molecule pickers', async () => {
    render(<LewisStructures />);
    await pick('4', 'nitrate');
    expect(
      screen.getByRole('heading', { name: 'Nitrate ion, NO₃⁻' }),
    ).toBeInTheDocument();
    expect(counter()).toHaveTextContent('6 of 24');
  });

  it('shows formal charges only once every electron is placed', async () => {
    render(<LewisStructures />);
    // bare skeleton: O would read +4, which means nothing yet
    expect(drawing().textContent).not.toContain('+4');
    await pick('3', 'ammonium');
    // NH₄⁺'s skeleton already uses all 8 electrons
    expect(drawing().textContent).toContain('+1');
  });

  it('can draw lone pairs as bars', async () => {
    const { container } = render(<LewisStructures />);
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
      render(<LewisStructures />);
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
      render(<LewisStructures />);
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
      render(<LewisStructures />);
      await pick('3', 'ammonium');
      const feedback = await checkWork();
      expect(feedback).toHaveTextContent('Almost');
      expect(feedback).toHaveTextContent("Mark N's formal charge (+1).");
      expect(feedback).toHaveTextContent(
        'Draw a polyatomic ion in brackets with its overall charge (+).',
      );
    });

    it('marks an ion correct once its charges and brackets are right', async () => {
      render(<LewisStructures />);
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
      render(<LewisStructures />);
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
    it('are on by default at every level and can be hidden', async () => {
      render(<LewisStructures />);
      await pick('5', 'sulfate');
      const hints = screen.getByRole('checkbox', { name: 'Show hints' });
      expect(hints).toBeChecked();
      expect(drawing().textContent).toContain('✓');
      expect(atom('S')).toHaveAccessibleName(/electrons, formal charge/);

      await userEvent.click(hints);
      expect(drawing().textContent).not.toContain('✓');
      expect(drawing().textContent).not.toContain('!');
      expect(atom('S')).toHaveAccessibleName('S atom: 0 lone pairs');
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
      render(<LewisStructures />);
      await userEvent.click(tool('Select'));
      layOut();
      drag(atom('H'), drawing());
      expect(distanceFromO(atom('H'))).toBeCloseTo(64);
    });

    it('can be switched off', async () => {
      render(<LewisStructures />);
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
      render(<LewisStructures />);
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
});
