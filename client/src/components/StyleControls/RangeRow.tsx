export function RangeRow(_props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  hint?: string;
}) {
  const { label, value, min, max, step = 1, unit = '', onChange, hint } = _props;

  return (
    <div className="range-row">
      <div className="range-row-header">
        <span className="inspector-label">{label}</span>
        <span className="range-row-value">{value}{unit}</span>
      </div>
      <input
        type="range"
        className="range-row-input"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <p className="inspector-hint">{hint}</p>}
    </div>
  );
}
