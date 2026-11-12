import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PeriodicTable from '~/pages/periodic-table';

function detailPanel() {
  return screen.getByRole('heading', { level: 2, name: /^(?!Periodic Table)/ })
    .parentElement!.parentElement!.parentElement!;
}

describe('Periodic Table page', () => {
  it('renders a button for all 118 elements', () => {
    render(<PeriodicTable />);
    expect(screen.getAllByRole('button')).toHaveLength(118);
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
});
