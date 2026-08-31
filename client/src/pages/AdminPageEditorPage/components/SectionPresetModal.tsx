import type { ComponentProps } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBullhorn,
  faEnvelopeOpenText,
  faFileLines,
  faLayerGroup,
  faNewspaper,
  faTableColumns,
  faWandMagicSparkles
} from '@fortawesome/free-solid-svg-icons';
import { Modal } from '@/components/AdminUI';
import { sectionPresets } from '@/utils/sectionPresets';
import type { PageSection } from '@/types';

interface SectionPresetModalProps {
  open: boolean;
  onClose: () => void;
  onSelectPreset: (presetId: string) => void;
  onAddBlank: () => void;
  sections: PageSection[];
}

const presetIcons: Record<string, ComponentProps<typeof FontAwesomeIcon>['icon']> = {
  'hero-2col': faTableColumns,
  'features-3col': faLayerGroup,
  'cta-1col': faBullhorn,
  'content-1col': faFileLines,
  'form-2col': faEnvelopeOpenText,
  'recent-posts': faNewspaper,
  'services-4': faWandMagicSparkles
};

export function SectionPresetModal({ open, onClose, onSelectPreset, onAddBlank, sections }: SectionPresetModalProps) {
  // Verificar se já existe uma seção Hero
  const hasHeroSection = sections.some((s) => s.kind === 'hero');

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Escolha um Preset de Seção"
      description="Selecione um modelo pronto para começar."
      width={860}
    >
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <div className="block-type-grid">
          {sectionPresets.map((preset) => {
            // Desabilitar preset Hero se já existir uma seção Hero
            const isHeroPreset = preset.id === 'hero-2col';
            const isDisabled = isHeroPreset && hasHeroSection;

            return (
              <button
                key={preset.id}
                type="button"
                className="block-type-card"
                onClick={() => !isDisabled && onSelectPreset(preset.id)}
                disabled={isDisabled}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', textAlign: 'center', padding: '1rem' }}
              >
                <div className="block-type-card-icon" aria-hidden="true">
                  <FontAwesomeIcon icon={presetIcons[preset.id] ?? faLayerGroup} />
                </div>
                <strong>
                  {preset.name}
                  {isDisabled && ' (já existe)'}
                </strong>
                <p className="muted small" style={{ margin: 0 }}>{preset.description}</p>
              </button>
            );
          })}
        </div>

        <div className="preset-divider">
          <button type="button" className="preset-blank-btn" onClick={onAddBlank}>
            + Seção em Branco (sem blocos)
          </button>
        </div>
      </div>
    </Modal>
  );
}
