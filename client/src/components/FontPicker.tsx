import { useEffect, useState } from 'react';

type FontOption = {
  name: string;
  category: string;
};

type FontPickerProps = {
  value: string | null;
  onChange: (font: string | null) => void;
  options: readonly FontOption[];
  label: string;
  previewText?: string;
};

function FontLoader({ fonts }: { fonts: string[] }) {
  useEffect(() => {
    const fontParams = fonts
      .map(font => `family=${encodeURIComponent(font)}:wght@400;600;700`)
      .join('&');

    if (!fontParams) return;

    const id = 'gfonts-picker-loader';
    const existing = document.getElementById(id);
    if (existing) return;

    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${fontParams}&display=swap`;
    document.head.appendChild(link);

    return () => {
      document.getElementById(id)?.remove();
    };
  }, [fonts]);

  return null;
}

function FontPickerOption({
  font,
  selected,
  onSelect,
}: {
  font: FontOption;
  selected: boolean;
  onSelect: () => void;
}) {
  useEffect(() => {
    const id = `gfont-preview-${font.name.replace(/\s+/g, '-')}`;
    if (document.getElementById(id)) return;

    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.name)}:wght@400&display=swap`;
    document.head.appendChild(link);
  }, [font.name]);

  return (
    <button
      role="option"
      type="button"
      className={`font-picker-option ${selected ? 'is-selected' : ''}`}
      onClick={onSelect}
      aria-selected={selected}
    >
      <span className="font-picker-name" style={{ fontFamily: `'${font.name}', serif` }}>
        {font.name}
      </span>
      <span className="font-picker-category muted small">{font.category}</span>
    </button>
  );
}

export function FontPicker({
  value,
  onChange,
  options,
  label,
  previewText = '[Título de impacto sobre o seu negócio]',
}: FontPickerProps) {
  const [search, setSearch] = useState('');

  const filtered = (options as FontOption[]).filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="font-picker">
      {value && <FontLoader fonts={[value]} />}

      <label className="font-picker-label">{label}</label>

      {/* Preview da fonte atual */}
      <div
        className="font-picker-preview"
        style={{ fontFamily: value ? `'${value}', serif` : 'inherit' }}
      >
        {previewText}
      </div>

      {/* Campo de busca */}
      <input
        type="text"
        placeholder="Buscar fonte..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="font-picker-search"
      />

      {/* Lista de opções */}
      <div className="font-picker-list" role="listbox" aria-label={label}>
        <button
          role="option"
          type="button"
          className={`font-picker-option ${!value ? 'is-selected' : ''}`}
          onClick={() => onChange(null)}
          aria-selected={!value}
        >
          <span className="font-picker-name">Padrão do sistema</span>
          <span className="font-picker-category muted small">System UI</span>
        </button>
        {filtered.map((font) => (
          <FontPickerOption
            key={font.name}
            font={font}
            selected={value === font.name}
            onSelect={() => onChange(font.name)}
          />
        ))}
      </div>
    </div>
  );
}
