import { useState } from 'react';
import { SegmentedControl } from '@/components/SegmentedControl';
import { ImagePickerModal } from '@/components/ImagePickerModal';
import { ColorSwatchPicker } from './ColorSwatchPicker';
import { RangeRow } from './RangeRow';
import type { BackgroundConfig } from '@/utils/backgroundHelpers';

export function BackgroundPicker({
  value,
  onChange
}: {
  value: BackgroundConfig;
  onChange: (v: BackgroundConfig) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const mode = value.mode;

  return (
    <div className="background-picker">
      <SegmentedControl<'none' | 'color' | 'image'>
        block
        ariaLabel="Modo de fundo"
        value={mode}
        options={[
          { value: 'none', label: 'Nenhum' },
          { value: 'color', label: 'Cor' },
          { value: 'image', label: 'Imagem' }
        ]}
        onChange={(m) => {
          if (m === 'none') onChange({ mode: 'none' });
          else if (m === 'color') onChange({ mode: 'color', color: value.color });
          else onChange({ mode: 'image', image: value.image });
        }}
      />

      {mode === 'color' && (
        <div className="background-picker-section">
          <ColorSwatchPicker
            value={value.color}
            onChange={(color) => onChange({ ...value, color })}
          />
        </div>
      )}

      {mode === 'image' && (
        <div className="background-picker-section">
          <button
            type="button"
            className="background-picker-preview"
            onClick={() => setPickerOpen(true)}
            aria-label={value.image?.url ? 'Alterar imagem de fundo' : 'Selecionar imagem de fundo'}
          >
            {value.image?.url ? (
              <img src={value.image.url} alt="" className="background-picker-thumb" />
            ) : (
              <span className="background-picker-empty">Nenhuma imagem</span>
            )}
            <span className="background-picker-change-label">
              {value.image?.url ? 'Alterar imagem' : 'Selecionar imagem'}
            </span>
          </button>

          {value.image?.url && (
            <>
              <div className="inspector-field" style={{ marginTop: '0.75rem' }}>
                <label className="inspector-label">Sobreposição</label>
                <SegmentedControl<'dark' | 'light'>
                  block
                  ariaLabel="Cor da sobreposição"
                  value={value.image.overlayColor ?? 'dark'}
                  options={[
                    { value: 'dark', label: 'Escura' },
                    { value: 'light', label: 'Clara' }
                  ]}
                  onChange={(overlayColor) =>
                    onChange({ ...value, image: { ...value.image!, overlayColor } })
                  }
                />
              </div>
              <RangeRow
                label="Opacidade da sobreposição"
                value={value.image.overlayOpacity ?? 0}
                min={0}
                max={80}
                step={5}
                unit="%"
                onChange={(overlayOpacity) =>
                  onChange({ ...value, image: { ...value.image!, overlayOpacity } })
                }
              />
            </>
          )}
        </div>
      )}

      <ImagePickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={({ mediaId, src }) => {
          onChange({
            ...value,
            mode: 'image',
            image: {
              mediaId,
              url: src,
              overlayOpacity: value.image?.overlayOpacity ?? 0,
              overlayColor: value.image?.overlayColor ?? 'dark'
            }
          });
          setPickerOpen(false);
        }}
        currentMediaId={value.image?.mediaId}
      />
    </div>
  );
}
