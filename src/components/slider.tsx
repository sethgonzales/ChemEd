import { cn } from '~/utils/cn';

interface Props {
  /* Optional label to display above the slider */
  label?: string;
  /* value of the slider */
  value: number;
  /* Minimum value of the slider */
  min?: number;
  /* Maximum value of the slider */
  max?: number;
  /* Step increment for the slider */
  step?: number;
  /* Number of labels to display along the slider track */
  rangeSteps?: number;
  /* Fn to call when the slider value changes */
  onChange?: (value: number) => void;
  /* Additional className for the slider container */
  className?: string;
  /* Additional className for the slider thumb */
  sliderThumb?: string;
}

const generateRangeLabels = (
  min: number,
  max: number,
  count: number,
): string[] => {
  if (count < 2) return [min.toString(), max.toString()];

  const step = (max - min) / (count - 1);

  return Array.from({ length: count }, (_, i) => {
    const value = min + step * i;
    return Number.isInteger(value) ? value.toString() : value.toFixed(0);
  });
};

export default function Slider(props: Props) {
  const {
    value = 0,
    min,
    max,
    label,
    step = 1,
    rangeSteps = 4,
    className,
    sliderThumb,
    onChange,
  } = props;

  const rangeLables =
    min !== undefined && max !== undefined && rangeSteps > 1
      ? generateRangeLabels(min, max, rangeSteps)
      : [];
  return (
    <div className={cn('relative space-y-2', className)}>
      {label && <label htmlFor="range-input">{label}</label>}
      <input
        id="range-input"
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        className={cn('slider-thumb w-full', sliderThumb)}
        onChange={(e) => onChange?.(parseInt(e.target.value))}
      />
      {rangeLables && rangeLables.length > 0 && (
        <div className="flex justify-between">
          {rangeLables.map((label, index) => (
            <span key={index} className="text-xs text-body">
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
