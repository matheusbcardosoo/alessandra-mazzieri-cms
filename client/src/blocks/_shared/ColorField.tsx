import type { ColorMode } from './colorUtils';

export function ColorField({
  label,
  mode,
  color,
  fallbackHex,
  defaultHint,
  onChange
}: {
  label: string;
  mode: ColorMode;
  color?: string | null;
  fallbackHex: string;
  defaultHint: string;
  onChange: (next: { mode: ColorMode; color: string | null }) => void;
}) {
  const current = color || fallbackHex;
  return (
    <div className="editor-field">
      <label>{label}</label>
      <div className="page-columns-toggle compact">
        <button
          type="button"
          className={mode !== 'custom' ? 'active' : ''}
          onClick={() => onChange({ mode: 'default', color: null })}
        >
          Padrão
        </button>
        <button
          type="button"
          className={mode === 'custom' ? 'active' : ''}
          onClick={() => onChange({ mode: 'custom', color: current })}
        >
          Personalizado
        </button>
      </div>
      {mode === 'custom' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(current) ? current : fallbackHex}
            onChange={(e) => onChange({ mode: 'custom', color: e.target.value })}
            style={{ width: '48px', height: '36px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
            aria-label={`${label} - seletor`}
          />
          <input
            type="text"
            value={color ?? ''}
            onChange={(e) => onChange({ mode: 'custom', color: e.target.value })}
            placeholder="#000000"
            style={{ width: '120px' }}
          />
        </div>
      ) : (
        <small className="muted" style={{ display: 'block', marginTop: '0.35rem' }}>{defaultHint}</small>
      )}
    </div>
  );
}
