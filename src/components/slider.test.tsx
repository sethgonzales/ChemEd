import { fireEvent, render, screen } from '@testing-library/react';
import Slider from './slider';

describe('Slider', () => {
  it('shows its label and current value', () => {
    render(<Slider label="Temperature" value={20} min={0} max={100} />);
    expect(screen.getByLabelText('Temperature')).toHaveValue('20');
  });

  it('shows evenly spaced range labels from min to max', () => {
    render(<Slider value={0} min={-25} max={125} rangeSteps={7} />);
    for (const label of ['-25', '0', '25', '50', '75', '100', '125']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('shows no range labels without min and max', () => {
    const { container } = render(<Slider value={0} />);
    expect(container.querySelectorAll('span')).toHaveLength(0);
  });

  it('calls onChange with the new value as a number', () => {
    const onChange = jest.fn();
    render(<Slider value={0} min={0} max={10} onChange={onChange} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '7' } });
    expect(onChange).toHaveBeenCalledWith(7);
  });
});
