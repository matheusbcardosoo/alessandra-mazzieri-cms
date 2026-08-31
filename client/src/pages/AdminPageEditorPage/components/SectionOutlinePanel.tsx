import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGripVertical, faLock, faXmark, faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import { getSectionColumnCount } from '@/utils/pageLayoutHelpers';
import type { PageSection } from '@/types';

function sectionBlockCount(section: PageSection): number {
  return section.cols.reduce((sum, col) => sum + col.blocks.length, 0);
}

export function SectionOutlinePanel(_props: {
  isOpen: boolean;
  sections: PageSection[];
  selectedSectionId: string | null;
  onClose: () => void;
  onSelectSection: (sectionId: string) => void;
  onReorder: (orderedIds: string[]) => void;
}) {
  const { isOpen, sections, selectedSectionId, onClose, onSelectSection, onReorder } = _props;
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const heroCount = sections.filter((s) => s.kind === 'hero').length;

  const reset = () => {
    setDragId(null);
    setOverId(null);
  };

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) {
      reset();
      return;
    }
    const ids = sections.map((s) => s.id);
    const from = ids.indexOf(dragId);
    let to = ids.indexOf(targetId);
    if (from < 0 || to < 0) {
      reset();
      return;
    }
    // Nunca posicionar antes do hero (fixo no topo)
    if (to < heroCount) to = heroCount;
    ids.splice(from, 1);
    ids.splice(to, 0, dragId);
    onReorder(ids);
    reset();
  };

  return (
    <>
      {isOpen && <div className="outline-overlay" onClick={onClose} />}
      <aside className={`section-outline${isOpen ? ' is-open' : ''}`} aria-hidden={!isOpen}>
        <div className="section-outline-header">
          <h3>
            <FontAwesomeIcon icon={faLayerGroup} /> Seções
          </h3>
          <button type="button" className="outline-close" onClick={onClose} aria-label="Fechar" title="Fechar">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {sections.length === 0 ? (
          <p className="inspector-hint" style={{ padding: '0 1rem' }}>
            Nenhuma seção ainda. Adicione uma no editor.
          </p>
        ) : (
          <>
            <p className="outline-hint">Arraste para reordenar. O Hero fica fixo no topo.</p>
            <ul className="outline-list">
              {sections.map((section, index) => {
                const isHero = section.kind === 'hero';
                const isSelected = section.id === selectedSectionId;
                const isHidden = section.settings?.hidden ?? false;
                const label = section.settings?.name?.trim() || (isHero ? 'Hero' : `Seção ${index + 1}`);
                const cols = getSectionColumnCount(section);
                const blockCount = sectionBlockCount(section);
                const rowClass = [
                  'outline-row',
                  isSelected ? 'is-selected' : '',
                  isHero ? 'is-pinned' : '',
                  isHidden ? 'is-hidden' : '',
                  overId === section.id && dragId ? 'is-over' : '',
                  dragId === section.id ? 'is-dragging' : ''
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <li
                    key={section.id}
                    className={rowClass}
                    draggable={!isHero}
                    onDragStart={() => !isHero && setDragId(section.id)}
                    onDragOver={(e) => {
                      if (!dragId) return;
                      e.preventDefault();
                      setOverId(section.id);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDrop(section.id);
                    }}
                    onDragEnd={reset}
                    onClick={() => onSelectSection(section.id)}
                  >
                    <span className="outline-grip" aria-hidden="true">
                      <FontAwesomeIcon icon={isHero ? faLock : faGripVertical} />
                    </span>
                    <span className="outline-row-main">
                      <span className="outline-row-label">
                        {label}
                        {isHidden && <span className="outline-hidden-badge">oculta</span>}
                      </span>
                      <span className="outline-row-meta">
                        {cols} col{cols > 1 ? 's' : ''} · {blockCount} bloco{blockCount === 1 ? '' : 's'}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </aside>
    </>
  );
}
