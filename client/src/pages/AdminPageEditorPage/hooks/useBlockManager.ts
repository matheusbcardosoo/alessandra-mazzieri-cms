import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  addBlockToSection,
  removeBlockFromSection,
  updateBlockInSection,
  moveBlockInColumn,
  moveBlockToColumn,
  moveBlockToColumnAt,
  reorderBlocksInColumn,
  duplicateBlock,
  canAddSideAtIndex,
  resolveSideTargetColumnIndex,
  getBlockRowIndex
} from '@/utils/pageLayoutHelpers';
import { calculateMaxFittingSpan } from '@/utils/columnSpan';
import type { PageBlock, PageSection } from '@/types';
import type { PageForm } from './usePageEditor';

export type BlockDraft = {
  id?: string;
  type: PageBlock['type'];
  colSpan?: number;
  data: PageBlock['data'];
  createdAt?: string;
  updatedAt?: string;
};

export type BlockModalState = {
  open: boolean;
  mode: 'add' | 'edit';
  sectionId: string;
  columnIndex: number;
  insertIndex: number;
  block?: PageBlock;
  placement?: 'insert' | 'side';
};

export type MoveModalState = {
  open: boolean;
  sectionId: string;
  columnIndex: number;
  blockIndex: number;
  block?: PageBlock;
};

export type DeleteModalState = {
  open: boolean;
  sectionId: string;
  columnIndex: number;
  block?: PageBlock;
};

export function useBlockManager(
  setPage: Dispatch<SetStateAction<PageForm>>,
  sections: PageSection[]
) {
  const [blockModal, setBlockModal] = useState<BlockModalState | null>(null);
  const [moveModal, setMoveModal] = useState<MoveModalState | null>(null);
  const [deleteModal, setDeleteModal] = useState<DeleteModalState | null>(null);
  const [hasUploading, setHasUploading] = useState(false);

  const [prevBlockModal, setPrevBlockModal] = useState(blockModal);
  if (blockModal !== prevBlockModal) {
    setPrevBlockModal(blockModal);
    if (!blockModal) setHasUploading(false);
  }

  const handleOpenAddBlock = (sectionId: string, columnIndex: number, insertIndex: number) => {
    setBlockModal({ open: true, mode: 'add', sectionId, columnIndex, insertIndex, placement: 'insert' });
  };

  const handleOpenEditBlock = (
    sectionId: string,
    columnIndex: number,
    block: PageBlock,
    blockIndex: number
  ) => {
    setBlockModal({ open: true, mode: 'edit', sectionId, columnIndex, insertIndex: blockIndex, block });
  };

  const handleSaveBlock = (draft: BlockDraft) => {
    if (!blockModal) return;
    const now = new Date().toISOString();
    const section = sections.find((s) => s.id === blockModal.sectionId);
    const maxSpan = Math.max(
      1,
      Math.min(
        (section?.settings?.columnsLayout as number) ||
          section?.columnsLayout ||
          section?.columns ||
          2,
        3
      )
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const colSpan = Math.max(1, Math.min((draft as any).colSpan ?? (blockModal.block?.colSpan ?? 1), maxSpan));
    const block: PageBlock = {
      id: draft.id ?? uuidv4(),
      type: draft.type,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: draft.data as any,
      colSpan,
      rowIndex: blockModal.mode === 'edit' ? blockModal.block?.rowIndex : undefined,
      createdAt: draft.createdAt ?? now,
      updatedAt: now
    };
    setPage((prev) => {
      let newLayout = prev.layout;
      if (blockModal.mode === 'add') {
        const placement = blockModal.placement === 'side' ? 'place' : 'insert';
        newLayout = addBlockToSection(
          newLayout,
          blockModal.sectionId,
          blockModal.columnIndex,
          block,
          blockModal.insertIndex,
          placement
        );
      } else {
        newLayout = updateBlockInSection(
          newLayout,
          blockModal.sectionId,
          blockModal.columnIndex,
          blockModal.block!.id,
          block
        );
      }
      return { ...prev, layout: newLayout };
    });
    setBlockModal(null);
  };

  // Edição ao vivo (inspector lateral): aplica data/colSpan imediatamente.
  const handleUpdateBlockData = (
    sectionId: string,
    columnIndex: number,
    blockId: string,
    data: PageBlock['data'],
    colSpanOverride?: number
  ) => {
    setPage((prev) => {
      const section = prev.layout.sections.find((s) => s.id === sectionId);
      const existing = section?.cols?.[columnIndex]?.blocks.find((b) => b.id === blockId);
      if (!existing || !section) return prev;
      const maxSpan = Math.max(
        1,
        Math.min(
          (section.settings?.columnsLayout as number) || section.columnsLayout || section.columns || 2,
          3
        )
      );
      // Além do limite geral de colunas da seção, o span também não pode invadir uma coluna
      // vizinha que já tenha conteúdo (evita sobreposição visual entre blocos).
      const rowIndex = getBlockRowIndex(existing, 0);
      const maxFittingSpan = calculateMaxFittingSpan(section, columnIndex, rowIndex, blockId);
      const nextSpan = Math.max(1, Math.min(colSpanOverride ?? existing.colSpan ?? 1, maxSpan, maxFittingSpan));
      const updated = {
        ...existing,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: data as any,
        colSpan: nextSpan,
        updatedAt: new Date().toISOString()
      } as PageBlock;
      return {
        ...prev,
        layout: updateBlockInSection(prev.layout, sectionId, columnIndex, blockId, updated)
      };
    });
  };

  const handleToggleBlockVisibility = (sectionId: string, columnIndex: number, blockId: string) => {
    setPage((prev) => {
      const section = prev.layout.sections.find((s) => s.id === sectionId);
      const existing = section?.cols?.[columnIndex]?.blocks.find((b) => b.id === blockId);
      if (!existing) return prev;
      const nextVisible = existing.visible === false ? true : false;
      const updated = { ...existing, visible: nextVisible } as PageBlock;
      return {
        ...prev,
        layout: updateBlockInSection(prev.layout, sectionId, columnIndex, blockId, updated)
      };
    });
  };

  const handleMoveBlock = (
    sectionId: string,
    columnIndex: number,
    blockId: string,
    direction: 'up' | 'down'
  ) => {
    setPage((prev) => ({
      ...prev,
      layout: moveBlockInColumn(prev.layout, sectionId, columnIndex, blockId, direction)
    }));
  };

  const handleOpenMoveModal = (
    sectionId: string,
    columnIndex: number,
    blockIndex: number,
    block: PageBlock
  ) => {
    setMoveModal({ open: true, sectionId, columnIndex, blockIndex, block });
  };

  const handleConfirmMoveColumn = (targetColumn: number) => {
    if (!moveModal) return;
    setPage((prev) => ({
      ...prev,
      layout: moveBlockToColumn(
        prev.layout,
        moveModal.sectionId,
        moveModal.columnIndex,
        targetColumn,
        moveModal.block!.id
      )
    }));
    setMoveModal(null);
  };

  const handleDeleteBlock = (sectionId: string, columnIndex: number, blockId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    const targetBlock = section?.cols?.[columnIndex]?.blocks.find((b) => b.id === blockId);
    if (targetBlock?.type === 'hero') {
      setDeleteModal(null);
      return;
    }
    setPage((prev) => ({
      ...prev,
      layout: removeBlockFromSection(prev.layout, sectionId, columnIndex, blockId)
    }));
    setDeleteModal(null);
  };

  const handleAddBlockSide = (sectionId: string, fromColumnIndex: number, rowIndex: number) => {
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;
    const targetColumnIndex = resolveSideTargetColumnIndex({
      columns: section.cols,
      fromColumnIndex,
      direction: 'right'
    });
    if (targetColumnIndex === null) return;
    const canAddSide = canAddSideAtIndex({
      columns: section.cols,
      fromColumnIndex,
      fromIndex: rowIndex,
      direction: 'right'
    });
    if (!canAddSide) return;
    setBlockModal({
      open: true,
      mode: 'add',
      sectionId,
      columnIndex: targetColumnIndex,
      insertIndex: rowIndex,
      placement: 'side'
    });
  };

  const handleDuplicateBlock = (sectionId: string, columnIndex: number, blockId: string) => {
    setPage((prev) => ({
      ...prev,
      layout: duplicateBlock(prev.layout, sectionId, columnIndex, blockId)
    }));
  };

  const handleReorderBlocksInColumn = (
    sectionId: string,
    columnIndex: number,
    orderedBlockIds: string[]
  ) => {
    setPage((prev) => ({
      ...prev,
      layout: reorderBlocksInColumn(prev.layout, sectionId, columnIndex, orderedBlockIds)
    }));
  };

  const handleMoveBlockToColumnAt = (
    sectionId: string,
    fromColumnIndex: number,
    toColumnIndex: number,
    blockId: string,
    toIndex: number
  ) => {
    setPage((prev) => ({
      ...prev,
      layout: moveBlockToColumnAt(prev.layout, sectionId, fromColumnIndex, toColumnIndex, blockId, toIndex)
    }));
  };

  const handleUpdateBlockBackground = (
    sectionId: string,
    columnIndex: number,
    blockId: string,
    blockBackground: import('@/utils/backgroundHelpers').BackgroundConfig
  ) => {
    setPage((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        sections: prev.layout.sections.map((sec) =>
          sec.id !== sectionId
            ? sec
            : {
                ...sec,
                cols: sec.cols.map((col, idx) =>
                  idx !== columnIndex
                    ? col
                    : {
                        ...col,
                        blocks: col.blocks.map((b) =>
                          b.id !== blockId
                            ? b
                            : { ...b, blockBackground, updatedAt: new Date().toISOString() }
                        )
                      }
                )
              }
        )
      }
    }));
  };

  return {
    blockModal,
    setBlockModal,
    moveModal,
    setMoveModal,
    deleteModal,
    setDeleteModal,
    hasUploading,
    setHasUploading,
    handleOpenAddBlock,
    handleOpenEditBlock,
    handleSaveBlock,
    handleUpdateBlockData,
    handleToggleBlockVisibility,
    handleMoveBlock,
    handleOpenMoveModal,
    handleConfirmMoveColumn,
    handleDeleteBlock,
    handleAddBlockSide,
    handleDuplicateBlock,
    handleReorderBlocksInColumn,
    handleMoveBlockToColumnAt,
    handleUpdateBlockBackground
  };
}
