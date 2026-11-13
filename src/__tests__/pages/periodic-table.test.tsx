import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BLOCK_COLORS, CATEGORY_COLORS } from '~/constants/blocks';
import PeriodicTable from '~/pages/periodic-table';
import { trendColor } from '~/utils/periodic-table';

function detailPanel() {
  return screen.getByRole('heading', { level: 2, name: /^(?!Periodic Table)/ })
    .parentElement!.parentElement!.parentElement!;
}

describe('Periodic Table page', () => {
  it('renders a button for all 118 elements', () => {
    render(<PeriodicTable />);
    expect(screen.getAllByRole('button', { name: /^\d+/ })).toHaveLength(118);
  });

  it('lays out 7 periods plus separate lanthanide and actinide rows', () => {
    const { container } = render(<PeriodicTable />);
    const [main, fBlock] = container.querySelectorAll('.grid');
    expect(main.children).toHaveLength(7 * 18);
    expect(fBlock.children).toHaveLength(2 * 18);

    // Ce (58) starts the lanthanide row in column 4; La (57) stays in group 3
    expect(fBlock.children[3]).toHaveTextContent('58Ce');
    expect(main.children[5 * 18 + 2]).toHaveTextContent('57La');
  });

  it('shows a legend for the four blocks', () => {
    render(<PeriodicTable />);
    for (const block of ['s-block', 'p-block', 'd-block', 'f-block']) {
      expect(screen.getByText(block)).toBeInTheDocument();
    }
  });

  it('shows hydrogen in the detail panel by default', () => {
    render(<PeriodicTable />);
    const panel = detailPanel();
    expect(
      within(panel).getByRole('heading', { name: 'Hydrogen' }),
    ).toBeInTheDocument();
    expect(within(panel).getByText('Element 1')).toBeInTheDocument();
  });

  it('shows details for the element that is clicked', async () => {
    render(<PeriodicTable />);
    await userEvent.click(screen.getByRole('button', { name: /^26\s*Fe/ }));

    const panel = detailPanel();
    expect(
      within(panel).getByRole('heading', { name: 'Iron' }),
    ).toBeInTheDocument();
    expect(within(panel).getByText('55.845')).toBeInTheDocument();
    expect(within(panel).getByText('8')).toBeInTheDocument(); // group

    // configuration renders occupancy as superscripts: [Ar] 3d⁶ 4s²
    const sups = panel.querySelectorAll('sup');
    expect([...sups].map((s) => s.textContent)).toEqual(['6', '2']);
  });

  it('shows N/A for the group of an f-block element', async () => {
    render(<PeriodicTable />);
    await userEvent.click(screen.getByRole('button', { name: /^58\s*Ce/ }));
    expect(within(detailPanel()).getByText('N/A')).toBeInTheDocument();
  });

  it('says what to do in one line', () => {
    render(<PeriodicTable />);
    expect(
      screen.getByText(/Click any element to see its details/),
    ).toBeInTheDocument();
  });

  it('shows a synthetic element’s mass number in brackets', async () => {
    render(<PeriodicTable />);
    await userEvent.click(screen.getByRole('button', { name: /^103\s*Lr/ }));
    expect(within(detailPanel()).getByText('[266]')).toBeInTheDocument();
  });

  it('marks the selected element as pressed', async () => {
    render(<PeriodicTable />);
    const iron = screen.getByRole('button', { name: /^26\s*Fe/ });
    expect(iron).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(iron);
    expect(iron).toHaveAttribute('aria-pressed', 'true');
  });

  it('moves between elements with the arrow keys', async () => {
    render(<PeriodicTable />);
    const cell = (name: RegExp) => screen.getByRole('button', { name });
    await userEvent.click(cell(/^26\s*Fe/));
    await userEvent.keyboard('{ArrowRight}');
    expect(cell(/^27\s*Co/)).toHaveFocus();
    expect(
      within(detailPanel()).getByRole('heading', { name: 'Cobalt' }),
    ).toBeInTheDocument();
    await userEvent.keyboard('{ArrowDown}');
    expect(cell(/^45\s*Rh/)).toHaveFocus();
  });

  it('puts only the selected element in the Tab order', () => {
    render(<PeriodicTable />);
    const tabbable = screen
      .getAllByRole('button', { name: /^\d+/ })
      .filter((b) => b.tabIndex === 0);
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toHaveAccessibleName(/^1\s*H/);
  });

  it('shrinks long element names so they fit their cell', () => {
    render(<PeriodicTable />);
    const size = (name: string) =>
      parseFloat(screen.getByText(name).style.getPropertyValue('--name-size'));
    expect(size('Iron')).toBe(1);
    expect(size('Rutherfordium')).toBeLessThan(size('Magnesium'));
    expect(size('Magnesium')).toBeLessThan(1);
  });
});

describe('Periodic Table page: colour modes', () => {
  const cell = (name: RegExp) => screen.getByRole('button', { name });
  const pick = async (mode: string) => {
    await userEvent.click(screen.getByRole('button', { name: /^Colour:/ }));
    await userEvent.click(screen.getByRole('button', { name: mode }));
  };

  it('colours by block to begin with', () => {
    render(<PeriodicTable />);
    expect(
      screen.getByRole('button', { name: 'Colour: Block' }),
    ).toBeInTheDocument();
    expect(cell(/^26\s*Fe/)).toHaveStyle({ backgroundColor: BLOCK_COLORS.d });
  });

  it('colours metals, metalloids and nonmetals, with a legend', async () => {
    render(<PeriodicTable />);
    await pick('Metals and nonmetals');
    expect(cell(/^26\s*Fe/)).toHaveStyle({
      backgroundColor: CATEGORY_COLORS.metal,
    });
    expect(cell(/^14\s*Si/)).toHaveStyle({
      backgroundColor: CATEGORY_COLORS.metalloid,
    });
    const legend = screen.getByTestId('legend');
    for (const label of ['Metal', 'Metalloid', 'Nonmetal', 'Unknown']) {
      expect(within(legend).getByText(label)).toBeInTheDocument();
    }
    expect(screen.queryByText('s-block')).not.toBeInTheDocument();
  });

  it('shades electronegativity from lowest to highest, with the range in the legend', async () => {
    render(<PeriodicTable />);
    await pick('Electronegativity');
    expect(cell(/^9\s*F/)).toHaveStyle({ backgroundColor: trendColor(1) });
    expect(cell(/^55\s*Cs/)).toHaveStyle({ backgroundColor: trendColor(0) });
    const legend = screen.getByTestId('legend');
    expect(legend).toHaveTextContent('0.79');
    expect(legend).toHaveTextContent('3.98');
    expect(legend).toHaveTextContent(/no data/i);
  });

  it('shades atomic radius in pm', async () => {
    render(<PeriodicTable />);
    await pick('Atomic radius');
    expect(cell(/^87\s*Fr/)).toHaveStyle({ backgroundColor: trendColor(1) });
    const legend = screen.getByTestId('legend');
    expect(legend).toHaveTextContent('28 pm');
    expect(legend).toHaveTextContent('260 pm');
  });
});

describe('Periodic Table page: more details', () => {
  it('shows the type, electronegativity and radius of the selected element', async () => {
    render(<PeriodicTable />);
    await userEvent.click(screen.getByRole('button', { name: /^26\s*Fe/ }));
    const panel = detailPanel();
    expect(within(panel).getByText('Metal')).toBeInTheDocument();
    expect(within(panel).getByText('1.83')).toBeInTheDocument();
    expect(within(panel).getByText('132 pm')).toBeInTheDocument();
  });

  it('says Unknown where an element has no value', async () => {
    render(<PeriodicTable />);
    await userEvent.click(screen.getByRole('button', { name: /^118\s*Og/ }));
    // type, electronegativity and radius
    expect(within(detailPanel()).getAllByText('Unknown')).toHaveLength(3);
  });
});

describe('Periodic Table page: search', () => {
  const search = () =>
    screen.getByRole('searchbox', { name: 'Search elements' });

  it('dims the elements that don’t match and says how many do', async () => {
    render(<PeriodicTable />);
    await userEvent.type(search(), 'fe');
    expect(screen.getByRole('status')).toHaveTextContent('2 matches');
    expect(screen.getByRole('button', { name: /^26\s*Fe/ })).toHaveStyle({
      opacity: '1',
    });
    expect(screen.getByRole('button', { name: /^8\s*O/ })).toHaveStyle({
      opacity: '0.25',
    });
  });

  it('selects the best match on Enter', async () => {
    render(<PeriodicTable />);
    await userEvent.type(search(), 'iron{Enter}');
    expect(
      within(detailPanel()).getByRole('heading', { name: 'Iron' }),
    ).toBeInTheDocument();
  });

  it('says when nothing matches, and shows everything once cleared', async () => {
    render(<PeriodicTable />);
    await userEvent.type(search(), 'xyz');
    expect(screen.getByRole('status')).toHaveTextContent('No matches');
    await userEvent.clear(search());
    expect(screen.getByRole('button', { name: /^8\s*O/ })).toHaveStyle({
      opacity: '1',
    });
  });
});
