import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  addSection,
  removeSection,
  moveSection,
  changeSectionColumns,
  duplicateSection,
  createSection,
  reorderSectionsByIds
} from '@/utils/pageLayoutHelpers';
import { createSectionFromPreset } from '@/utils/sectionPresets';
import type { PageSection } from '@/types';
import type { PageForm } from './usePageEditor';
import { toast } from '@/components/toastStore';

export function useSectionManager(
  setPage: Dispatch<SetStateAction<PageForm>>,
  sections: PageSection[]
) {
  const [presetModal, setPresetModal] = useState(false);
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | undefined>(undefined);

  const handleAddSection = (afterSectionId?: string) => {
    if (afterSectionId) {
      const index = sections.findIndex((s) => s.id === afterSectionId);
      setInsertAfterIndex(index >= 0 ? index + 1 : undefined);
    } else {
      setInsertAfterIndex(undefined);
    }
    setPresetModal(true);
  };

  const handleSelectPreset = (presetId: string) => {
    const newSection = createSectionFromPreset(presetId);
    if (newSection) {
      if (newSection.kind === 'hero' && sections.some((s) => s.kind === 'hero')) {
        toast.warning('Seção Hero duplicada', {
          message: 'Já existe uma seção Hero nesta página. Apenas uma é permitida.',
          code: 'EDITOR-001',
        });
        setPresetModal(false);
        return;
      }
      setPage((prev) => ({ ...prev, layout: addSection(prev.layout, newSection, insertAfterIndex) }));
    }
    setPresetModal(false);
    setInsertAfterIndex(undefined);
  };

  const handleAddBlankSection = () => {
    const newSection = createSection(2);
    setPage((prev) => ({ ...prev, layout: addSection(prev.layout, newSection, insertAfterIndex) }));
    setPresetModal(false);
    setInsertAfterIndex(undefined);
  };

  const handleRemoveSection = (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (section?.kind === 'hero') return;
    setPage((prev) => ({ ...prev, layout: removeSection(prev.layout, sectionId) }));
  };

  const handleDuplicateSection = (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId);
    if (section?.kind === 'hero') return;
    setPage((prev) => ({ ...prev, layout: duplicateSection(prev.layout, sectionId) }));
  };

  const handleMoveSection = (sectionId: string, direction: 'up' | 'down') => {
    const section = sections.find((s) => s.id === sectionId);
    if (section?.kind === 'hero') return;
    setPage((prev) => ({ ...prev, layout: moveSection(prev.layout, sectionId, direction) }));
  };

  const handleUpdateSectionSettings = (
    sectionId: string,
    patch: Partial<NonNullable<PageSection['settings']>>
  ) => {
    setPage((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        sections: prev.layout.sections.map((sec) =>
          sec.id === sectionId ? { ...sec, settings: { ...sec.settings, ...patch } } : sec
        )
      }
    }));
  };

  const handleToggleSectionHidden = (sectionId: string) => {
    setPage((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        sections: prev.layout.sections.map((sec) =>
          sec.id === sectionId
            ? { ...sec, settings: { ...sec.settings, hidden: !(sec.settings?.hidden ?? false) } }
            : sec
        )
      }
    }));
  };

  const handleReorderSections = (orderedIds: string[]) => {
    setPage((prev) => ({ ...prev, layout: reorderSectionsByIds(prev.layout, orderedIds) }));
  };

  const handleChangeSectionColumns = (sectionId: string, columns: 1 | 2 | 3) => {
    setPage((prev) => ({ ...prev, layout: changeSectionColumns(prev.layout, sectionId, columns) }));
  };

  const handleChangeSectionBackground = (
    sectionId: string,
    background: 'none' | 'soft' | 'dark' | 'earthy'
  ) => {
    setPage((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        sections: prev.layout.sections.map((s) =>
          s.id === sectionId
            ? { ...s, settings: { ...s.settings, background } }
            : s
        )
      }
    }));
  };

  const handleChangeSectionPadding = (
    sectionId: string,
    padding: 'normal' | 'compact' | 'large'
  ) => {
    setPage((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        sections: prev.layout.sections.map((s) =>
          s.id === sectionId
            ? { ...s, settings: { ...s.settings, padding } }
            : s
        )
      }
    }));
  };

  const handleChangeSectionMaxWidth = (sectionId: string, maxWidth: 'normal' | 'wide') => {
    setPage((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        sections: prev.layout.sections.map((s) =>
          s.id === sectionId
            ? { ...s, settings: { ...s.settings, maxWidth } }
            : s
        )
      }
    }));
  };

  const handleChangeSectionHeight = (sectionId: string, height: 'normal' | 'tall') => {
    setPage((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        sections: prev.layout.sections.map((s) =>
          s.id === sectionId
            ? { ...s, settings: { ...s.settings, height } }
            : s
        )
      }
    }));
  };

  return {
    presetModal,
    setPresetModal,
    handleAddSection,
    handleSelectPreset,
    handleAddBlankSection,
    handleRemoveSection,
    handleDuplicateSection,
    handleMoveSection,
    handleReorderSections,
    handleToggleSectionHidden,
    handleUpdateSectionSettings,
    handleChangeSectionColumns,
    handleChangeSectionBackground,
    handleChangeSectionPadding,
    handleChangeSectionMaxWidth,
    handleChangeSectionHeight
  };
}
