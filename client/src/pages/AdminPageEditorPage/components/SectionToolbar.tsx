import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEyeSlash, faGripVertical } from '@fortawesome/free-solid-svg-icons';
import { IconButton } from '@/components/AdminUI';
import type { PageSection } from '@/types';
import type { SectionDragHandle } from './SortableSection';

export function SectionToolbar(_props: {
  section: PageSection;
  sectionIndex: number;
  totalSections: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSettings: () => void;
  onToggleHidden: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  dragHandle?: SectionDragHandle;
}) {
  const {
    section,
    sectionIndex,
    totalSections,
    onMoveUp,
    onMoveDown,
    onSettings,
    onToggleHidden,
    onDuplicate,
    onRemove,
    dragHandle
  } = _props;

  const isHero = section.kind === 'hero';
  const isHidden = section.settings?.hidden ?? false;
  const isFirst = sectionIndex === 0;
  const isLast = sectionIndex === totalSections - 1;

  return (
    <div className="section-toolbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {!isHero && dragHandle && (
          <button
            type="button"
            className="section-drag-handle"
            aria-label="Arrastar para reordenar seção"
            title="Arrastar para reordenar"
            {...dragHandle.attributes}
            {...dragHandle.listeners}
          >
            <FontAwesomeIcon icon={faGripVertical} />
          </button>
        )}
        <strong style={{ fontSize: '0.9rem' }}>
          {isHero ? 'Hero (Seção Fixa)' : section.settings?.name?.trim() || `Seção ${sectionIndex + 1}`}
        </strong>
        {isHidden && (
          <span className="section-hidden-badge">
            <FontAwesomeIcon icon={faEyeSlash} /> Oculta
          </span>
        )}

        {!isHero && (
          <>
            <IconButton
              icon="arrow-up"
              label="Mover para cima"
              onClick={onMoveUp}
              disabled={isFirst}
            />
            <IconButton
              icon="arrow-down"
              label="Mover para baixo"
              onClick={onMoveDown}
              disabled={isLast}
            />

            <div style={{ width: '1px', height: '20px', background: '#ddd', margin: '0 0.25rem' }} />

            <IconButton
              icon="edit"
              label="Configurar seção"
              onClick={onSettings}
            />
            <IconButton
              icon={isHidden ? 'eye-off' : 'eye'}
              label={isHidden ? 'Mostrar seção' : 'Ocultar seção'}
              onClick={onToggleHidden}
            />
            <IconButton
              icon="copy"
              label="Duplicar seção"
              onClick={onDuplicate}
            />
            <IconButton
              icon="trash"
              label="Remover seção"
              onClick={onRemove}
            />
          </>
        )}
      </div>
    </div>
  );
}
