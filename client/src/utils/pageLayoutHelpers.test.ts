import { describe, expect, it } from 'vitest';
import { reorderBlocksInColumn, moveBlockToColumnAt } from './pageLayoutHelpers';
import type { PageLayoutV2, PageBlock } from '../types';

function makeBlock(id: string, rowIndex: number): PageBlock {
  return { id, type: 'text', rowIndex, data: { contentHtml: '' } } as PageBlock;
}

function makeLayout(colBlocks: PageBlock[][]): PageLayoutV2 {
  return {
    version: 2,
    sections: [
      {
        id: 'sec1',
        columns: colBlocks.length as 1 | 2 | 3,
        cols: colBlocks.map((blocks, i) => ({ id: `col${i}`, blocks })),
        settings: {}
      }
    ]
  };
}

function getBlockOrder(layout: PageLayoutV2, colIndex: number): string[] {
  return layout.sections[0].cols[colIndex].blocks
    .slice()
    .sort((a, b) => (a.rowIndex ?? 0) - (b.rowIndex ?? 0))
    .map((b) => b.id);
}

describe('reorderBlocksInColumn', () => {
  it('reorders two blocks within a single column', () => {
    const layout = makeLayout([[makeBlock('a', 0), makeBlock('b', 1)]]);
    const result = reorderBlocksInColumn(layout, 'sec1', 0, ['b', 'a']);
    expect(getBlockOrder(result, 0)).toEqual(['b', 'a']);
  });

  it('reorders three blocks to a new order', () => {
    const layout = makeLayout([[makeBlock('x', 0), makeBlock('y', 1), makeBlock('z', 2)]]);
    const result = reorderBlocksInColumn(layout, 'sec1', 0, ['z', 'x', 'y']);
    expect(getBlockOrder(result, 0)).toEqual(['z', 'x', 'y']);
  });

  it('assigns sequential rowIndex values after reorder', () => {
    const layout = makeLayout([[makeBlock('a', 0), makeBlock('b', 1)]]);
    const result = reorderBlocksInColumn(layout, 'sec1', 0, ['b', 'a']);
    const cols = result.sections[0].cols[0].blocks.sort((x, y) => (x.rowIndex ?? 0) - (y.rowIndex ?? 0));
    expect(cols[0].rowIndex).toBe(0);
    expect(cols[1].rowIndex).toBe(1);
  });

  it('does not touch other columns', () => {
    const layout = makeLayout([
      [makeBlock('a', 0), makeBlock('b', 1)],
      [makeBlock('c', 0), makeBlock('d', 1)]
    ]);
    const result = reorderBlocksInColumn(layout, 'sec1', 0, ['b', 'a']);
    expect(getBlockOrder(result, 1)).toEqual(['c', 'd']);
  });
});

describe('moveBlockToColumnAt', () => {
  it('moves a block from column 0 to column 1 at position 0', () => {
    const layout = makeLayout([
      [makeBlock('a', 0), makeBlock('b', 1)],
      [makeBlock('c', 0)]
    ]);
    const result = moveBlockToColumnAt(layout, 'sec1', 0, 1, 'b', 0);
    expect(getBlockOrder(result, 0)).toEqual(['a']);
    expect(getBlockOrder(result, 1)).toEqual(['b', 'c']);
  });

  it('moves a block from column 1 to column 0 at the end', () => {
    const layout = makeLayout([
      [makeBlock('a', 0)],
      [makeBlock('b', 0), makeBlock('c', 1)]
    ]);
    const result = moveBlockToColumnAt(layout, 'sec1', 1, 0, 'c', 1);
    expect(getBlockOrder(result, 0)).toEqual(['a', 'c']);
    expect(getBlockOrder(result, 1)).toEqual(['b']);
  });

  it('assigns sequential rowIndex after move', () => {
    const layout = makeLayout([
      [makeBlock('a', 0), makeBlock('b', 1)],
      [makeBlock('c', 0)]
    ]);
    const result = moveBlockToColumnAt(layout, 'sec1', 0, 1, 'a', 0);
    const col1 = result.sections[0].cols[1].blocks.sort((x, y) => (x.rowIndex ?? 0) - (y.rowIndex ?? 0));
    expect(col1[0].rowIndex).toBe(0);
    expect(col1[1].rowIndex).toBe(1);
  });
});
