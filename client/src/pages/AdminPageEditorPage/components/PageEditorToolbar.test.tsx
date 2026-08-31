import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { PageEditorToolbar } from './PageEditorToolbar';
import { SectionEditor } from './SectionEditor';
import type { PageForm } from '../hooks/usePageEditor';
import type { PageSection } from '@/types';

const page: PageForm = {
  id: 'home-id',
  title: 'Home',
  slug: '',
  description: '',
  status: 'published',
  pageKey: 'home',
  layout: { version: 2, sections: [] }
};

function renderToolbar() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(
    <MemoryRouter>
      <PageEditorToolbar
        page={page}
        isNew={false}
        busy={false}
        draftAlert={null}
        formError={null}
        hasUploading={false}
        isHomePage
        onSaveDraft={vi.fn()}
        onPublish={vi.fn()}
        onMoveToDraft={vi.fn()}
        onConfigurePage={vi.fn()}
      />
    </MemoryRouter>
  );

  return { container, root };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('PageEditorToolbar', () => {
  test('uses Font Awesome icons instead of emoji glyphs in editor controls', async () => {
    const { container, root } = renderToolbar();
    await vi.waitFor(() => {
      expect(container.querySelector('svg')).not.toBeNull();
    });

    expect(container.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u);
    root.unmount();
  });

  test('keeps section controls from being clipped behind the editor container', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const section: PageSection = {
      id: 'section-1',
      columns: 1,
      cols: [{ id: 'col-1', blocks: [] }]
    };

    root.render(
      <SectionEditor
        section={section}
        sectionIndex={0}
        totalSections={1}
        onMoveSection={vi.fn()}
        onRemoveSection={vi.fn()}
        onDuplicateSection={vi.fn()}
        onConfigureSection={vi.fn()}
        onToggleSectionHidden={vi.fn()}
        onAddBlock={vi.fn()}
        onAddBlockSide={vi.fn()}
        onEditBlock={vi.fn()}
        onMoveBlock={vi.fn()}
        onMoveBlockColumn={vi.fn()}
        onDeleteBlock={vi.fn()}
        onDuplicateBlock={vi.fn()}
        onToggleBlockVisible={vi.fn()}
        onReorderBlocksInColumn={vi.fn()}
        onMoveBlockToColumnAt={vi.fn()}
      />
    );

    await vi.waitFor(() => {
      const editor = container.querySelector<HTMLElement>('.page-section-editor');
      expect(editor?.style.overflow).toBe('visible');
    });
    root.unmount();
  });

  test('marks only the blocks listed in brokenMediaBlockIds with the broken-media class and badge', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const section: PageSection = {
      id: 'section-1',
      columns: 1,
      cols: [
        {
          id: 'col-1',
          blocks: [
            { id: 'block-broken', type: 'text', data: { contentHtml: '<p>Broken</p>' } },
            { id: 'block-ok', type: 'text', data: { contentHtml: '<p>OK</p>' } }
          ]
        }
      ]
    };

    root.render(
      <SectionEditor
        section={section}
        sectionIndex={0}
        totalSections={1}
        onMoveSection={vi.fn()}
        onRemoveSection={vi.fn()}
        onDuplicateSection={vi.fn()}
        onConfigureSection={vi.fn()}
        onToggleSectionHidden={vi.fn()}
        brokenMediaBlockIds={new Set(['block-broken'])}
        onAddBlock={vi.fn()}
        onAddBlockSide={vi.fn()}
        onEditBlock={vi.fn()}
        onMoveBlock={vi.fn()}
        onMoveBlockColumn={vi.fn()}
        onDeleteBlock={vi.fn()}
        onDuplicateBlock={vi.fn()}
        onToggleBlockVisible={vi.fn()}
        onReorderBlocksInColumn={vi.fn()}
        onMoveBlockToColumnAt={vi.fn()}
      />
    );

    await vi.waitFor(() => {
      expect(container.querySelectorAll('.editable-block').length).toBe(2);
    });

    const blocks = container.querySelectorAll<HTMLElement>('.editable-block');
    const [brokenBlock, okBlock] = Array.from(blocks);

    expect(brokenBlock.classList.contains('has-broken-media')).toBe(true);
    expect(brokenBlock.textContent).toContain('⚠ Imagem indisponível');

    expect(okBlock.classList.contains('has-broken-media')).toBe(false);
    expect(okBlock.textContent).not.toContain('⚠ Imagem indisponível');

    root.unmount();
  });
});
