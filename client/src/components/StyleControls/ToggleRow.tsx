export function ToggleRow(_props: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
  disabled?: boolean;
}) {
  const { label, value, onChange, hint, disabled } = _props;

  return (
    <label className="toggle-row">
      <span className="toggle-row-label">{label}</span>
      <span className={`toggle-switch${value ? ' is-on' : ''}${disabled ? ' is-disabled' : ''}`}>
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="toggle-switch-input"
        />
        <span className="toggle-switch-thumb" />
      </span>
      {hint && <span className="inspector-hint">{hint}</span>}
    </label>
  );
}
