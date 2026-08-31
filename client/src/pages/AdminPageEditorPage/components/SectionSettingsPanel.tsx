import type { PageSection } from '@/types';
import { getSectionColumnCount } from '@/utils/pageLayoutHelpers';
import { SegmentedControl } from '@/components/SegmentedControl';
import { BackgroundPicker } from '@/components/StyleControls';
import { sectionSettingsToBgConfig } from '@/utils/backgroundHelpers';
import type { BackgroundConfig } from '@/utils/backgroundHelpers';

type Columns = 1 | 2 | 3;
type Padding = 'normal' | 'compact' | 'large';
type MaxWidth = 'normal' | 'wide';
type Height = 'normal' | 'tall';

export function SectionSettingsPanel(_props: {
  section: PageSection;
  onChangeSectionColumns: (columns: Columns) => void;
  onChangeSectionPadding: (padding: Padding) => void;
  onChangeSectionMaxWidth: (maxWidth: MaxWidth) => void;
  onChangeSectionHeight: (height: Height) => void;
  onUpdateSettings: (patch: Partial<NonNullable<PageSection['settings']>>) => void;
}) {
  const {
    section,
    onChangeSectionColumns,
    onChangeSectionPadding,
    onChangeSectionMaxWidth,
    onChangeSectionHeight,
    onUpdateSettings
  } = _props;

  const padding = (section.settings?.padding || 'normal') as Padding;
  const maxWidth = (section.settings?.maxWidth || 'normal') as MaxWidth;
  const height = (section.settings?.height || 'normal') as Height;
  const columnsCount = getSectionColumnCount(section);
  const name = section.settings?.name ?? '';
  const anchorId = section.settings?.anchorId ?? '';
  const columnGap = (section.settings?.columnGap ?? 'md') as 'sm' | 'md' | 'lg';
  const verticalAlign = (section.settings?.verticalAlign ?? 'top') as 'top' | 'center' | 'bottom';
  const isHero = section.kind === 'hero';

  const bgConfig: BackgroundConfig = sectionSettingsToBgConfig(section.settings ?? {});

  const handleBgChange = (bg: BackgroundConfig) => {
    onUpdateSettings({
      backgroundMode: bg.mode,
      backgroundColor: bg.color,
      backgroundImage: bg.image
    });
  };

  if (isHero) {
    return (
      <div className="section-settings-panel">
        <h3 className="inspector-section-title">Configurações da Seção</h3>
        <p className="inspector-hint">
          A seção Hero é fixa e não pode ser reconfigurada por aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="section-settings-panel">
      <h3 className="inspector-section-title">Configurações da Seção</h3>

      <div className="inspector-field">
        <label className="inspector-label">Colunas</label>
        <SegmentedControl<string>
          block
          ariaLabel="Colunas"
          value={String(columnsCount)}
          options={[
            { value: '1', label: '1' },
            { value: '2', label: '2' },
            { value: '3', label: '3' }
          ]}
          onChange={(v) => onChangeSectionColumns(Number(v) as Columns)}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label">Fundo</label>
        <BackgroundPicker value={bgConfig} onChange={handleBgChange} />
      </div>

      <div className="inspector-field">
        <label className="inspector-label">Espaçamento</label>
        <SegmentedControl<Padding>
          block
          ariaLabel="Espaçamento"
          value={padding}
          options={[
            { value: 'compact', label: 'Compacto' },
            { value: 'normal', label: 'Normal' },
            { value: 'large', label: 'Generoso' }
          ]}
          onChange={onChangeSectionPadding}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label">Altura</label>
        <SegmentedControl<Height>
          block
          ariaLabel="Altura"
          value={height}
          options={[
            { value: 'normal', label: 'Normal' },
            { value: 'tall', label: 'Alta' }
          ]}
          onChange={onChangeSectionHeight}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label">Largura máxima</label>
        <SegmentedControl<MaxWidth>
          block
          ariaLabel="Largura máxima"
          value={maxWidth}
          options={[
            { value: 'normal', label: 'Normal' },
            { value: 'wide', label: 'Largo' }
          ]}
          onChange={onChangeSectionMaxWidth}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label">Nome da seção (interno)</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onUpdateSettings({ name: e.target.value })}
          placeholder="Ex: Sobre, Serviços..."
        />
        <p className="inspector-hint">Aparece só no editor e no organizador, não no site.</p>
      </div>

      <div className="inspector-field">
        <label className="inspector-label">Espaço entre colunas</label>
        <SegmentedControl<'sm' | 'md' | 'lg'>
          block
          ariaLabel="Espaço entre colunas"
          value={columnGap}
          options={[
            { value: 'sm', label: 'Pequeno' },
            { value: 'md', label: 'Médio' },
            { value: 'lg', label: 'Grande' }
          ]}
          onChange={(v) => onUpdateSettings({ columnGap: v })}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label">Alinhamento vertical</label>
        <SegmentedControl<'top' | 'center' | 'bottom'>
          block
          ariaLabel="Alinhamento vertical"
          value={verticalAlign}
          options={[
            { value: 'top', label: 'Topo' },
            { value: 'center', label: 'Centro' },
            { value: 'bottom', label: 'Base' }
          ]}
          onChange={(v) => onUpdateSettings({ verticalAlign: v })}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label">Âncora (id para links)</label>
        <input
          type="text"
          value={anchorId}
          onChange={(e) =>
            onUpdateSettings({ anchorId: e.target.value.replace(/[^a-zA-Z0-9_-]/g, '') })
          }
          placeholder="ex: sobre"
        />
        <p className="inspector-hint">Permite link direto até esta seção: /p/slug#ancora</p>
      </div>
    </div>
  );
}
