import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable';
import { ConfirmModal } from '@/components/AdminUI';
import { canAddSideAtIndex, getBlockRowIndex, sortBlocksByRowIndex } from '@/utils/pageLayoutHelpers';
import { getSectionColumnCount } from '@/utils/pageLayoutHelpers';
import {
  calculateBlockColStart,
  calculateBlockSpan,
  findNextAvailableRow,
  getBlockGridColumnStyle,
  isFullWidthBlock
} from '@/utils/columnSpan';
import { buildBgStyle, sectionSettingsToBgConfig } from '@/utils/backgroundHelpers';
import type { PageBlock, PageSection } from '@/types';
import { EditableBlock } from './EditableBlock';
import { SectionToolbar } from './SectionToolbar';
import { SortableBlock } from './SortableBlock';
import type { SectionDragHandle } from './SortableSection';
import { blockRegistry } from '@/blocks/registry';
import type { BlockType } from '@/types';

function AddBlockButton(_props: { onClick: () => void; style?: React.CSSProperties; label?: string }) {
  const { onClick, style, label } = _props;
  return (
    <button type="button" className="page-add-block" onClick={onClick} style={style}>
      {label || '+ Adicionar bloco'}
    </button>
  );
}

export function SectionEditor(_props: {
  section: PageSection;
  sectionIndex: number;
  totalSections: number;
  onMoveSection: (direction: 'up' | 'down') => void;
  onRemoveSection: () => void;
  onDuplicateSection: () => void;
  onConfigureSection: () => void;
  onToggleSectionHidden: () => void;
  selectedBlockId?: string | null;
  brokenMediaBlockIds?: Set<string>;
  onAddBlock: (columnIndex: number, insertIndex: number) => void;
  onAddBlockSide: (columnIndex: number, rowIndex: number) => void;
  onEditBlock: (columnIndex: number, block: PageBlock, blockIndex: number) => void;
  onMoveBlock: (columnIndex: number, blockId: string, direction: 'up' | 'down') => void;
  onMoveBlockColumn: (columnIndex: number, blockIndex: number, block: PageBlock) => void;
  onDeleteBlock: (columnIndex: number, block: PageBlock) => void;
  onDuplicateBlock: (columnIndex: number, blockId: string) => void;
  onToggleBlockVisible: (columnIndex: number, block: PageBlock) => void;
  onReorderBlocksInColumn: (columnIndex: number, orderedBlockIds: string[]) => void;
  onMoveBlockToColumnAt: (fromColumnIndex: number, toColumnIndex: number, blockId: string, toIndex: number) => void;
  dragHandle?: SectionDragHandle;
}) {
  const {
    section,
    sectionIndex,
    totalSections,
    onMoveSection,
    onRemoveSection,
    onDuplicateSection,
    onConfigureSection,
    onToggleSectionHidden,
    selectedBlockId,
    brokenMediaBlockIds,
    onAddBlock,
    onAddBlockSide,
    onEditBlock,
    onMoveBlock,
    onMoveBlockColumn,
    onDeleteBlock,
    onDuplicateBlock,
    onToggleBlockVisible,
    onReorderBlocksInColumn,
    onMoveBlockToColumnAt,
    dragHandle
  } = _props;

  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const isSectionHidden = section.settings?.hidden ?? false;

  // Novo sistema de fundo
  const hasNewBgSystem = !!section.settings?.backgroundMode;
  const bgConfig = sectionSettingsToBgConfig(section.settings ?? {});
  const { wrapperStyle: sectionBgStyle, overlayStyle: sectionBgOverlay } = buildBgStyle(bgConfig);

  // Legado: data-bg para classes CSS de preset (soft/dark/earthy)
  const legacyBg = !hasNewBgSystem
    ? (section.settings?.backgroundStyle || section.settings?.background || undefined)
    : undefined;
  const gapMapEditor: Record<string, string> = { sm: '0.75rem', md: '1rem', lg: '2rem' };
  const editorGap = section.settings?.columnGap ? gapMapEditor[section.settings.columnGap] : '1rem';
  const alignMapEditor: Record<string, string> = { top: 'flex-start', center: 'flex-start', bottom: 'flex-start' };
  const editorAlign = section.settings?.verticalAlign ? alignMapEditor[section.settings.verticalAlign] : 'flex-start';
  const columnsCount = getSectionColumnCount(section);

  const blockSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleBlockDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleBlockDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    let activeColIndex = -1;
    let overColIndex = -1;
    let activeOrder: string[] = [];
    let overOrder: string[] = [];

    for (let colIdx = 0; colIdx < section.cols.length; colIdx++) {
      const sorted = sortBlocksByRowIndex(section.cols[colIdx].blocks);
      const blockIds = sorted.map((b) => b.id);
      if (blockIds.includes(activeId)) { activeColIndex = colIdx; activeOrder = blockIds; }
      if (blockIds.includes(overId)) { overColIndex = colIdx; overOrder = blockIds; }
    }

    if (activeColIndex < 0) return;

    if (activeColIndex === overColIndex) {
      const from = activeOrder.indexOf(activeId);
      const to = activeOrder.indexOf(overId);
      if (from >= 0 && to >= 0) onReorderBlocksInColumn(activeColIndex, arrayMove(activeOrder, from, to));
    } else if (overColIndex >= 0) {
      const toIndex = overOrder.indexOf(overId);
      onMoveBlockToColumnAt(activeColIndex, overColIndex, activeId, toIndex);
    }
  };

  return (
    <div
      id={`editor-section-${section.id}`}
      className={`page-section-editor admin-card${isSectionHidden ? ' is-hidden' : ''}`}
      style={{ marginBottom: '1.5rem', position: 'relative', overflow: 'visible', ...sectionBgStyle }}
      data-bg={legacyBg}
    >
      {sectionBgOverlay && (
        <div style={{ ...sectionBgOverlay, zIndex: 0 }} aria-hidden />
      )}
      <SectionToolbar
        section={section}
        sectionIndex={sectionIndex}
        totalSections={totalSections}
        onMoveUp={() => onMoveSection('up')}
        onMoveDown={() => onMoveSection('down')}
        onSettings={onConfigureSection}
        onToggleHidden={onToggleSectionHidden}
        onDuplicate={onDuplicateSection}
        onRemove={() => setShowConfirmDelete(true)}
        dragHandle={dragHandle}
      />

      <DndContext
        sensors={blockSensors}
        collisionDetection={closestCenter}
        onDragStart={handleBlockDragStart}
        onDragEnd={handleBlockDragEnd}
        onDragCancel={() => setActiveDragId(null)}
      >
        {(() => {
          // Colunas por-bloco são renderizadas num único CSS grid (em vez de uma
          // pilha flex isolada por coluna) para que blocos configurados com
          // colSpan > 1 realmente ocupem múltiplas colunas visualmente no editor,
          // do mesmo jeito que aparecem depois de publicados (ver PageRenderer).
          const columnsBlocks = section.cols.map((col) => sortBlocksByRowIndex(col.blocks));
          const headerRowOffset = columnsCount > 1 ? 1 : 0;
          const maxRowIndex = columnsBlocks.reduce((max, blocks) => {
            return blocks.reduce((colMax, block, idx) => Math.max(colMax, getBlockRowIndex(block, idx)), max);
          }, -1);
          const footerRow = maxRowIndex + 2 + headerRowOffset;

          return (
            <div
              className="page-editor-columns"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${columnsCount}, minmax(0, 1fr))`,
                gap: editorGap,
                alignItems: editorAlign
              }}
            >
              {columnsCount > 1 && section.cols.map((col, colIndex) => (
                <div
                  key={`header-${col.id}`}
                  className="page-col-header"
                  style={{ gridColumn: colIndex + 1, gridRow: 1 }}
                >
                  <strong>Coluna {colIndex + 1}</strong>
                </div>
              ))}

              {section.cols.map((col, colIndex) => {
                const sortedBlocks = columnsBlocks[colIndex];
                return (
                  <SortableContext
                    key={col.id}
                    items={sortedBlocks.map((b) => b.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {sortedBlocks.map((block, blockIdx) => {
                      const isLocked = block.isLocked || block.type === 'hero';
                      const canAddSide = canAddSideAtIndex({
                        columns: section.cols,
                        fromColumnIndex: colIndex,
                        fromIndex: blockIdx,
                        direction: 'right'
                      });
                      const rowIndex = getBlockRowIndex(block, blockIdx);
                      const span = calculateBlockSpan(block, columnsCount);
                      const colStart = calculateBlockColStart(colIndex, span, columnsCount);
                      const gridColumnStyle = getBlockGridColumnStyle(colStart, span, isFullWidthBlock(block));
                      return (
                        <SortableBlock
                          key={block.id}
                          id={block.id}
                          disabled={isLocked}
                          style={{ ...gridColumnStyle, gridRow: rowIndex + 1 + headerRowOffset, minWidth: 0 }}
                        >
                          <div className="page-block-wrapper">
                            <EditableBlock
                              block={block}
                              isSelected={selectedBlockId === block.id}
                              hasBrokenMedia={brokenMediaBlockIds?.has(block.id) ?? false}
                              onSelect={() => onEditBlock(colIndex, block, blockIdx)}
                              onDelete={() => !isLocked && onDeleteBlock(colIndex, block)}
                              onDuplicate={() => onDuplicateBlock(colIndex, block.id)}
                              onMoveUp={() => !isLocked && onMoveBlock(colIndex, block.id, 'up')}
                              onMoveDown={() => !isLocked && onMoveBlock(colIndex, block.id, 'down')}
                              onMoveColumn={() => onMoveBlockColumn(colIndex, blockIdx, block)}
                              onToggleVisible={() => onToggleBlockVisible(colIndex, block)}
                              onAddSide={() => onAddBlockSide(colIndex, blockIdx)}
                              canAddSide={canAddSide}
                              disableMoveUp={isLocked || blockIdx === 0}
                              disableMoveDown={isLocked || blockIdx === sortedBlocks.length - 1}
                            />
                          </div>
                        </SortableBlock>
                      );
                    })}
                  </SortableContext>
                );
              })}

              {section.cols.map((col, colIndex) => {
                const sortedBlocks = columnsBlocks[colIndex];
                return (
                  <div
                    key={`footer-${col.id}`}
                    style={{
                      gridColumn: colIndex + 1,
                      gridRow: footerRow,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      minWidth: 0
                    }}
                  >
                    {sortedBlocks.length === 0 && (
                      <div className="admin-empty" style={{ fontSize: '0.85rem' }}>
                        Sem blocos nesta coluna.
                      </div>
                    )}

                    <AddBlockButton onClick={() => onAddBlock(colIndex, findNextAvailableRow(section, colIndex))} />
                  </div>
                );
              })}
            </div>
          );
        })()}

        <DragOverlay dropAnimation={null}>
          {activeDragId ? (() => {
            const activeBlock = section.cols.flatMap((c) => c.blocks).find((b) => b.id === activeDragId);
            const label = activeBlock ? (blockRegistry[activeBlock.type as BlockType]?.label ?? activeBlock.type) : '';
            return <div className="block-drag-overlay">{label}</div>;
          })() : null}
        </DragOverlay>
      </DndContext>

      <ConfirmModal
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        title="Remover seção"
        description="Tem certeza que deseja remover esta seção? Todos os blocos serão perdidos."
        onConfirm={() => {
          onRemoveSection();
          setShowConfirmDelete(false);
        }}
        confirmLabel="Remover"
      />
    </div>
  );
}
