import { describe, expect, it } from 'vitest';
import { organizeSectionBlocksIntoRows, validateBlockOrdering } from './blockGridHelpers';
import type { PageBlock, PageSection } from '../types';

function createTestBlock(id: string, rowIndex: number, visible = true): PageBlock {
  return {
    id,
    type: 'text',
    rowIndex,
    visible,
    data: { contentHtml: `Block ${id}` }
  } as PageBlock;
}

describe('blockGridHelpers', () => {
  it('organizes an aligned two-column layout row by row', () => {
    const section: PageSection = {
      id: 'test-section',
      columns: 2,
      cols: [
        { id: 'col-0', blocks: [createTestBlock('block-1', 0), createTestBlock('block-3', 1)] },
        { id: 'col-1', blocks: [createTestBlock('block-2', 0), createTestBlock('block-4', 1)] }
      ],
      settings: {}
    };

    const rows = organizeSectionBlocksIntoRows(section);

    expect(rows.map((row) => row.cells.map((cell) => cell?.block.id ?? null))).toEqual([
      ['block-1', 'block-2'],
      ['block-3', 'block-4']
    ]);
    expect(validateBlockOrdering(section).isValid).toBe(true);
  });

  it('preserves empty cells when a layout has gaps', () => {
    const section: PageSection = {
      id: 'test-section-2',
      columns: 2,
      cols: [
        { id: 'col-0', blocks: [createTestBlock('block-1', 0), createTestBlock('block-3', 2)] },
        { id: 'col-1', blocks: [createTestBlock('block-2', 1), createTestBlock('block-4', 2)] }
      ],
      settings: {}
    };

    const rows = organizeSectionBlocksIntoRows(section);

    expect(rows.map((row) => row.cells.map((cell) => cell?.block.id ?? null))).toEqual([
      ['block-1', null],
      [null, 'block-2'],
      ['block-3', 'block-4']
    ]);
  });

  it('supports three-column layouts', () => {
    const section: PageSection = {
      id: 'test-section-3',
      columns: 3,
      cols: [
        { id: 'col-0', blocks: [createTestBlock('a1', 0), createTestBlock('a2', 1)] },
        { id: 'col-1', blocks: [createTestBlock('b1', 0), createTestBlock('b2', 1)] },
        { id: 'col-2', blocks: [createTestBlock('c1', 0), createTestBlock('c2', 1)] }
      ],
      settings: { columnsLayout: 3 }
    };

    const rows = organizeSectionBlocksIntoRows(section);

    expect(rows.map((row) => row.cells.map((cell) => cell?.block.id ?? null))).toEqual([
      ['a1', 'b1', 'c1'],
      ['a2', 'b2', 'c2']
    ]);
  });

  it('omits hidden blocks from rendered rows', () => {
    const section: PageSection = {
      id: 'test-section-4',
      columns: 2,
      cols: [
        { id: 'col-0', blocks: [createTestBlock('visible', 0)] },
        { id: 'col-1', blocks: [createTestBlock('hidden', 0, false)] }
      ],
      settings: {}
    };

    const rows = organizeSectionBlocksIntoRows(section);

    expect(rows).toHaveLength(1);
    expect(rows[0].cells[0]?.block.id).toBe('visible');
    expect(rows[0].cells[1]).toBeNull();
  });
});
