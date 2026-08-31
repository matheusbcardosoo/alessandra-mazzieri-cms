import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen } from '@fortawesome/free-solid-svg-icons';
import { IconButton } from '@/components/AdminUI';
import { PageBlockView } from '@/components/PageRenderer';
import { blockRegistry } from '@/blocks/registry';
import { BlockActionsDropdown } from './BlockActionsDropdown';
import type { BlockType, PageBlock } from '@/types';

export function EditableBlock(_props: {
  block: PageBlock;
  isSelected: boolean;
  hasBrokenMedia?: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveColumn: () => void;
  onToggleVisible: () => void;
  onAddSide: () => void;
  canAddSide: boolean;
  disableMoveUp?: boolean;
  disableMoveDown?: boolean;
}) {
  const {
    block,
    isSelected,
    hasBrokenMedia,
    onSelect,
    onDelete,
    onDuplicate,
    onMoveUp,
    onMoveDown,
    onMoveColumn,
    onToggleVisible,
    onAddSide,
    canAddSide,
    disableMoveUp,
    disableMoveDown
  } = _props;

  const label = blockRegistry[block.type as BlockType]?.label ?? block.type;
  const isHero = block.type === 'hero';
  const isHidden = block.visible === false;

  return (
    <div
      className={`editable-block${isSelected ? ' is-selected' : ''}${isHidden ? ' is-hidden' : ''}${hasBrokenMedia ? ' has-broken-media' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSelect();
      }}
    >
      <span className="editable-block-label">{label}{isHidden ? ' · oculto' : ''}</span>

      {hasBrokenMedia && (
        <span className="editable-block-media-warning" title="Uma imagem deste bloco não existe mais — reenvie a imagem.">
          ⚠ Imagem indisponível
        </span>
      )}

      <div className="editable-block-toolbar" onClick={(e) => e.stopPropagation()}>
        <IconButton icon="edit" label="Editar" tone="info" onClick={onSelect} />
        {!isHero && (
          <>
            <IconButton icon="arrow-up" label="Mover para cima" onClick={onMoveUp} disabled={disableMoveUp} />
            <IconButton icon="arrow-down" label="Mover para baixo" onClick={onMoveDown} disabled={disableMoveDown} />
            <IconButton
              icon={isHidden ? 'eye-off' : 'eye'}
              label={isHidden ? 'Mostrar bloco' : 'Ocultar bloco'}
              onClick={onToggleVisible}
            />
            <BlockActionsDropdown
              onDuplicate={onDuplicate}
              onMoveColumn={onMoveColumn}
              onDelete={onDelete}
              canAddSide={canAddSide}
              onAddSide={onAddSide}
            />
          </>
        )}
      </div>

      <div className="editable-block-body">
        <PageBlockView block={block} enableFormSubmit={false} />
      </div>

      {isSelected && (
        <button
          type="button"
          className="editable-block-edit-fab"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          title="Editar bloco"
          aria-label="Editar bloco"
        >
          <FontAwesomeIcon icon={faPen} />
        </button>
      )}
    </div>
  );
}
