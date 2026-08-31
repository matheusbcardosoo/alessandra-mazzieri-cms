import { IconButton } from '@/components/AdminUI';
import { PageBlockView } from '@/components/PageRenderer';
import { blockRegistry } from '@/blocks/registry';
import { BlockActionsDropdown } from './BlockActionsDropdown';
import type { BlockType, PageBlock } from '@/types';

export function BlockCard(_props: {
  block: PageBlock;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveColumn: () => void;
  onAddSide: () => void;
  canAddSide: boolean;
  disableMoveUp?: boolean;
  disableMoveDown?: boolean;
}) {
  const {
    block,
    onEdit,
    onDelete,
    onDuplicate,
    onMoveUp,
    onMoveDown,
    onMoveColumn,
    onAddSide,
    canAddSide,
    disableMoveUp,
    disableMoveDown
  } = _props;
  const label = blockRegistry[block.type as BlockType]?.label ?? block.type;

  // Hero V2 é fixo: não pode ser movido ou deletado
  const isHero = block.type === 'hero';

  return (
    <div className="page-block-card admin-card" style={{ position: 'relative' }}>
      {/* Badge de tipo - sempre visível */}
      <div
        className="block-type-badge"
        style={{
          position: 'absolute',
          top: '6px',
          left: '8px',
          fontSize: '0.7rem',
          opacity: 0.5,
          fontWeight: 500,
          textTransform: 'capitalize',
          zIndex: 1,
          pointerEvents: 'none'
        }}
      >
        [{label}]
      </div>

      {/* Barra de ações - aparece no hover */}
      <div
        className="block-actions-bar"
        style={{
          position: 'absolute',
          top: '-36px',
          left: 0,
          right: 0,
          background: '#f9f4ec',
          border: '1px solid #e1e5eb',
          borderBottom: 'none',
          borderRadius: '8px 8px 0 0',
          padding: '0.5rem 0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          opacity: 0,
          pointerEvents: 'none',
          transition: 'opacity 150ms ease',
          zIndex: 2
        }}
      >
        {/* Primário: Editar */}
        <IconButton icon="edit" label="Editar" tone="info" onClick={onEdit} />

        {/* Secundários: Mover */}
        {!isHero && (
          <>
            <IconButton
              icon="arrow-up"
              label="Mover para cima"
              onClick={onMoveUp}
              disabled={disableMoveUp}
            />
            <IconButton
              icon="arrow-down"
              label="Mover para baixo"
              onClick={onMoveDown}
              disabled={disableMoveDown}
            />
          </>
        )}

        {/* Dropdown com ações secundárias */}
        {!isHero && (
          <BlockActionsDropdown
            onDuplicate={onDuplicate}
            onMoveColumn={onMoveColumn}
            onDelete={onDelete}
            canAddSide={canAddSide}
            onAddSide={onAddSide}
          />
        )}
      </div>

      {/* Conteúdo do bloco */}
      <div className="page-block-card-body">
        <PageBlockView block={block} />
      </div>

      {/* Ativa hover state */}
      <style>{`
        .page-block-card:hover .block-actions-bar {
          opacity: 1;
          pointer-events: auto;
        }
      `}</style>
    </div>
  );
}
