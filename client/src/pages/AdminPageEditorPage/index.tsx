import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker, useParams } from 'react-router-dom';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable';
import { ConfirmModal } from '@/components/AdminUI';
import { toast } from '@/components/toastStore';
import { SeoHead } from '@/components/SeoHead';
import { usePageValidation } from '@/hooks/usePageValidation';
import { usePageMissingMedia } from '@/hooks/queries/usePages';
import { ValidationErrorsModal } from '@/components/ValidationComponents';
import { usePageEditor } from './hooks/usePageEditor';
import { useSectionManager } from './hooks/useSectionManager';
import { useBlockManager } from './hooks/useBlockManager';
import { usePageHistory } from './hooks/usePageHistory';
import { useEditorShortcuts } from './hooks/useEditorShortcuts';
import { PageEditorToolbar } from './components/PageEditorToolbar';
import { PageVersionHistoryModal } from './components/PageVersionHistoryModal';
import { SectionEditor } from './components/SectionEditor';
import { BlockEditorModal } from './components/BlockEditorModal';
import { SectionPresetModal } from './components/SectionPresetModal';
import { MoveBlockModal } from './components/MoveBlockModal';
import { EditorDrawer } from './components/EditorDrawer';
import { SectionSettingsPanel } from './components/SectionSettingsPanel';
import { PageSettingsPanel } from './components/PageSettingsPanel';
import { BlockInspector } from './components/BlockInspector';
import { SectionOutlinePanel } from './components/SectionOutlinePanel';
import { SortableSection } from './components/SortableSection';
import { calculateMaxFittingSpan } from '@/utils/columnSpan';
import { getBlockRowIndex, sortBlocksByRowIndex } from '@/utils/pageLayoutHelpers';

type EditorSelection =
  | { kind: 'page' }
  | { kind: 'section'; sectionId: string }
  | { kind: 'block'; sectionId: string; columnIndex: number; blockId: string };

// Blocos "section-like" (form rico/largo) editam no modal amplo, nao no painel lateral.
const MODAL_EDIT_TYPES: ReadonlySet<string> = new Set([
  'hero',
  'recent-posts',
  'services',
  'contact-info',
  'text'
]);

export function AdminPageEditorPage({ pageKey }: { pageKey?: string }) {
  const { id } = useParams<{ id: string }>();
  const editor = usePageEditor(id, pageKey);
  const {
    page, setPage, formError, draftAlert,
    busyMutations, isNew, isHomePage, isLoadingPage, isPageError,
    refetchPage, saveDraft, publish, handleMoveToDraft, isDirty, applyRevertedPage
  } = editor;
  const [historyOpen, setHistoryOpen] = useState(false);

  const sections = useSectionManager(setPage, page.layout.sections);
  const blocks = useBlockManager(setPage, page.layout.sections);
  const { errors: validationErrors, fieldStates, markFieldTouched, validateForPublication } = usePageValidation(page);
  const { data: missingMedia } = usePageMissingMedia(page.id);
  const brokenMediaBlockIds = useMemo(
    () => new Set((missingMedia ?? []).map((m) => m.blockId)),
    [missingMedia]
  );
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [selection, setSelection] = useState<EditorSelection | null>(null);
  const selectedBlockId = selection?.kind === 'block' ? selection.blockId : null;
  const closeInspector = () => setSelection(null);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const selectedSectionId = selection?.kind === 'section' ? selection.sectionId : null;

  // Surface save errors (incl. server-side, ex.: hero sem imagem) as toasts.
  const lastSaveErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (formError && formError !== lastSaveErrorRef.current) {
      lastSaveErrorRef.current = formError;
      toast.error('Não foi possível salvar', { message: formError });
    }
    if (!formError) lastSaveErrorRef.current = null;
  }, [formError]);

  const handleSaveDraft = async () => {
    // Avisa sobre pendências da página (campos, imagens quebradas, etc.)
    const seen = new Set<string>();
    validationErrors.forEach((err) => {
      const key = `${err.field}:${err.message}`;
      if (seen.has(key)) return;
      seen.add(key);
      toast.warning(err.field, { message: err.message });
    });
    try {
      const result = await saveDraft();
      if (result) {
        toast.success(isHomePage ? 'Home salva com sucesso' : 'Rascunho salvo');
      }
    } catch {
      // Erro já tratado pelo efeito de formError acima.
    }
  };

  const history = usePageHistory({
    layout: page.layout,
    pageId: page.id,
    applyLayout: (l) => setPage((prev) => ({ ...prev, layout: l }))
  });
  useEditorShortcuts({
    onUndo: history.undo,
    onRedo: history.redo,
    onSave: () => {
      void handleSaveDraft();
    }
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = page.layout.sections.map((s) => s.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const reordered = arrayMove(ids, from, to);
    // Hero(s) sempre fixos no topo, preservando a ordem relativa.
    const heroIds = page.layout.sections.filter((s) => s.kind === 'hero').map((s) => s.id);
    const heroSet = new Set(heroIds);
    const finalIds = [...heroIds, ...reordered.filter((id) => !heroSet.has(id))];
    sections.handleReorderSections(finalIds);
  };

  const isDirtyRef = useRef(isDirty);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirtyRef.current && currentLocation.pathname !== nextLocation.pathname
  );

  const handleSelectSectionFromOutline = (sectionId: string) => {
    setSelection({ kind: 'section', sectionId });
    requestAnimationFrame(() => {
      const el = document.getElementById(`editor-section-${sectionId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const busy = busyMutations || blocks.hasUploading;

  const handlePublish = async () => {
    if (isHomePage) {
      await saveDraft();
      return;
    }
    const errors = validateForPublication();
    if (errors.length > 0) {
      setShowValidationErrors(true);
      return;
    }
    const saved = await saveDraft();
    if (!saved?.id) return;
    await publish(saved.id);
  };

  if (isHomePage && isLoadingPage) {
    return (
      <div className="admin-page">
        <SeoHead title="Pagina inicial" />
        <div className="admin-page-header">
          <h1 style={{ margin: 0 }}>Pagina inicial</h1>
          <p className="muted">Carregando builder...</p>
        </div>
        <div className="admin-card" style={{ padding: '1.25rem', display: 'grid', gap: '0.75rem' }}>
          <div className="skeleton" style={{ height: '18px', width: '180px' }} />
          <div className="skeleton" style={{ height: '12px', width: '60%' }} />
          <div className="skeleton" style={{ height: '280px', width: '100%' }} />
        </div>
      </div>
    );
  }

  if (isHomePage && isPageError) {
    return (
      <div className="admin-page">
        <SeoHead title="Pagina inicial" />
        <div className="admin-card">
          <div className="admin-empty">
            <h3>Erro ao carregar a home</h3>
            <p className="muted">Não foi possível recuperar os blocos da página inicial.</p>
            <button className="btn btn-primary" type="button" onClick={() => refetchPage()}>
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  const columnCount = blocks.blockModal
    ? Math.max(
        1,
        Math.min(
          (page.layout.sections.find((s) => s.id === blocks.blockModal!.sectionId)?.settings?.columnsLayout as number) ||
            page.layout.sections.find((s) => s.id === blocks.blockModal!.sectionId)?.columnsLayout ||
            page.layout.sections.find((s) => s.id === blocks.blockModal!.sectionId)?.columns ||
            2,
          3
        )
      )
    : 2;

  return (
    <div className="admin-page editor-page">
      <SeoHead title={isNew ? 'Nova página' : `Editar: ${page.title}`} />
      <PageEditorToolbar
        page={page}
        isNew={isNew || !page.id}
        busy={busy}
        draftAlert={draftAlert}
        formError={formError}
        validationMessages={validationErrors.map((err) => err.message)}
        hasUploading={blocks.hasUploading}
        isHomePage={isHomePage}
        onSaveDraft={() => handleSaveDraft()}
        onPublish={handlePublish}
        onMoveToDraft={handleMoveToDraft}
        onConfigurePage={() => setSelection({ kind: 'page' })}
        onOpenHistory={() => setHistoryOpen(true)}
        isDirty={isDirty}
        onToggleOutline={() => setOutlineOpen((o) => !o)}
        onUndo={history.undo}
        onRedo={history.redo}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
      />

      <div className="editor-body">
        <div className="editor-container">
          <div className="editor-main" style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
                <div className="page-editor-canvas">
                  {page.layout.sections.length === 0 && (
                    <div className="admin-empty">
                      <p>Nenhuma seção adicionada. Clique em "+ Adicionar seção" para começar.</p>
                    </div>
                  )}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleSectionDragEnd}
                  >
                    <SortableContext
                      items={page.layout.sections.map((s) => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                  {page.layout.sections.map((section, sectionIndex) => (
                    <Fragment key={section.id}>
                    <SortableSection id={section.id} disabled={section.kind === 'hero'}>
                      {({ attributes, listeners }) => (
                    <SectionEditor
                      section={section}
                      sectionIndex={sectionIndex}
                      totalSections={page.layout.sections.length}
                      onMoveSection={(dir) => sections.handleMoveSection(section.id, dir)}
                      onRemoveSection={() => sections.handleRemoveSection(section.id)}
                      onDuplicateSection={() => sections.handleDuplicateSection(section.id)}
                      onConfigureSection={() => setSelection({ kind: 'section', sectionId: section.id })}
                      selectedBlockId={selectedBlockId}
                      brokenMediaBlockIds={brokenMediaBlockIds}
                      onAddBlock={(colIndex, insertIndex) => blocks.handleOpenAddBlock(section.id, colIndex, insertIndex)}
                      onAddBlockSide={(colIndex, rowIndex) => blocks.handleAddBlockSide(section.id, colIndex, rowIndex)}
                      onEditBlock={(colIndex, block, blockIndex) => {
                        if (MODAL_EDIT_TYPES.has(block.type)) {
                          blocks.handleOpenEditBlock(section.id, colIndex, block, blockIndex);
                        } else {
                          setSelection({ kind: 'block', sectionId: section.id, columnIndex: colIndex, blockId: block.id });
                        }
                      }}
                      onMoveBlock={(colIndex, blockId, dir) => blocks.handleMoveBlock(section.id, colIndex, blockId, dir)}
                      onMoveBlockColumn={(colIndex, blockIndex, block) => blocks.handleOpenMoveModal(section.id, colIndex, blockIndex, block)}
                      onDeleteBlock={(colIndex, block) => blocks.setDeleteModal({ open: true, sectionId: section.id, columnIndex: colIndex, block })}
                      onDuplicateBlock={(colIndex, blockId) => blocks.handleDuplicateBlock(section.id, colIndex, blockId)}
                      onToggleSectionHidden={() => sections.handleToggleSectionHidden(section.id)}
                      onToggleBlockVisible={(colIndex, block) =>
                        blocks.handleToggleBlockVisibility(section.id, colIndex, block.id)
                      }
                      onReorderBlocksInColumn={(colIndex, orderedIds) =>
                        blocks.handleReorderBlocksInColumn(section.id, colIndex, orderedIds)
                      }
                      onMoveBlockToColumnAt={(fromCol, toCol, blockId, toIdx) =>
                        blocks.handleMoveBlockToColumnAt(section.id, fromCol, toCol, blockId, toIdx)
                      }
                      dragHandle={{ attributes, listeners }}
                    />
                      )}
                    </SortableSection>
                    <div className="section-inserter-row">
                      <button
                        type="button"
                        className="section-inserter"
                        onClick={() => sections.handleAddSection(section.id)}
                      >
                        + Inserir seção aqui
                      </button>
                    </div>
                    </Fragment>
                  ))}
                    </SortableContext>
                  </DndContext>
                  <div style={{ marginTop: '1.5rem' }}>
                    <button className="btn btn-outline" type="button" onClick={() => sections.handleAddSection()}>
                      + Adicionar seção
                    </button>
                  </div>
                </div>
            </div>
        </div>
      </div>

      <BlockEditorModal
        state={blocks.blockModal}
        onClose={() => blocks.setBlockModal(null)}
        onSave={blocks.handleSaveBlock}
        onUploadingChange={blocks.setHasUploading}
        columnCount={columnCount}
      />

      <SectionPresetModal
        open={sections.presetModal}
        onClose={() => sections.setPresetModal(false)}
        onSelectPreset={sections.handleSelectPreset}
        onAddBlank={sections.handleAddBlankSection}
        sections={page.layout.sections}
      />

      <MoveBlockModal
        state={blocks.moveModal}
        section={blocks.moveModal ? page.layout.sections.find((s) => s.id === blocks.moveModal!.sectionId) : undefined}
        onClose={() => blocks.setMoveModal(null)}
        onConfirm={blocks.handleConfirmMoveColumn}
      />

      <ConfirmModal
        isOpen={!!blocks.deleteModal?.block}
        onClose={() => blocks.setDeleteModal(null)}
        title="Remover bloco"
        description="Tem certeza que deseja remover este bloco?"
        onConfirm={() => {
          if (!blocks.deleteModal?.block) return;
          if (selectedBlockId === blocks.deleteModal.block.id) closeInspector();
          blocks.handleDeleteBlock(
            blocks.deleteModal.sectionId,
            blocks.deleteModal.columnIndex,
            blocks.deleteModal.block.id
          );
        }}
        confirmLabel="Remover"
      />

      <ValidationErrorsModal
        isOpen={showValidationErrors}
        onClose={() => setShowValidationErrors(false)}
        errors={validationErrors}
        onGoToError={() => setShowValidationErrors(false)}
      />

      <EditorDrawer isOpen={selection !== null} onClose={closeInspector}>
        {selection?.kind === 'page' && (
          <PageSettingsPanel
            page={page}
            setPage={setPage}
            fieldStates={fieldStates}
            markFieldTouched={markFieldTouched}
          />
        )}
        {selection?.kind === 'section' &&
          (() => {
            const section = page.layout.sections.find((s) => s.id === selection.sectionId);
            if (!section) return null;
            return (
              <SectionSettingsPanel
                section={section}
                onChangeSectionColumns={(cols) => sections.handleChangeSectionColumns(selection.sectionId, cols)}
                onChangeSectionPadding={(pad) => sections.handleChangeSectionPadding(selection.sectionId, pad)}
                onChangeSectionMaxWidth={(mw) => sections.handleChangeSectionMaxWidth(selection.sectionId, mw)}
                onChangeSectionHeight={(h) => sections.handleChangeSectionHeight(selection.sectionId, h)}
                onUpdateSettings={(patch) => sections.handleUpdateSectionSettings(selection.sectionId, patch)}
              />
            );
          })()}
        {selection?.kind === 'block' &&
          (() => {
            const section = page.layout.sections.find((s) => s.id === selection.sectionId);
            const block = section?.cols?.[selection.columnIndex]?.blocks.find((b) => b.id === selection.blockId);
            if (!section || !block) {
              return <p className="inspector-hint">Bloco nao encontrado. Selecione outro bloco no canvas.</p>;
            }
            const sectionColumnCount = Math.max(
              1,
              Math.min(
                (section.settings?.columnsLayout as number) ||
                  section.columnsLayout ||
                  section.columns ||
                  2,
                3
              )
            );
            const columnBlocksSorted = sortBlocksByRowIndex(section.cols[selection.columnIndex]?.blocks ?? []);
            const blockPosition = columnBlocksSorted.findIndex((b) => b.id === block.id);
            const blockRowIndex = getBlockRowIndex(block, blockPosition >= 0 ? blockPosition : 0);
            const maxFittingSpan = calculateMaxFittingSpan(section, selection.columnIndex, blockRowIndex, block.id);
            return (
              <BlockInspector
                block={block}
                columnCount={sectionColumnCount}
                maxSpan={maxFittingSpan}
                onChangeData={(data) =>
                  blocks.handleUpdateBlockData(selection.sectionId, selection.columnIndex, selection.blockId, data)
                }
                onChangeColSpan={(span) =>
                  blocks.handleUpdateBlockData(
                    selection.sectionId,
                    selection.columnIndex,
                    selection.blockId,
                    block.data,
                    span
                  )
                }
                onUploadingChange={blocks.setHasUploading}
                onChangeBlockBackground={(bg) =>
                  blocks.handleUpdateBlockBackground(
                    selection.sectionId,
                    selection.columnIndex,
                    selection.blockId,
                    bg
                  )
                }
              />
            );
          })()}
      </EditorDrawer>

      <SectionOutlinePanel
        isOpen={outlineOpen}
        sections={page.layout.sections}
        selectedSectionId={selectedSectionId}
        onClose={() => setOutlineOpen(false)}
        onSelectSection={handleSelectSectionFromOutline}
        onReorder={sections.handleReorderSections}
      />

      <ConfirmModal
        isOpen={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="Sair sem salvar?"
        description="Você tem alterações não salvas que serão perdidas se sair agora."
        onConfirm={() => blocker.proceed?.()}
        confirmLabel="Sair sem salvar"
        cancelLabel="Continuar editando"
      />

      <PageVersionHistoryModal
        isOpen={historyOpen}
        pageId={page.id}
        onClose={() => setHistoryOpen(false)}
        onReverted={(reverted) => {
          applyRevertedPage(reverted);
          toast.success('Página revertida', { message: `Versão de "${reverted.title}" restaurada e publicada.` });
        }}
      />
    </div>
  );
}
