import type { PageBlock, PageSection } from '../types';
import { getSectionColumnCount } from './pageLayoutHelpers';

/**
 * Helper to get block row index with fallback
 */
function getBlockRowIndex(block: PageBlock, fallbackIndex: number): number {
  const rowIndex = block.rowIndex;
  return Number.isInteger(rowIndex) && rowIndex! >= 0 ? rowIndex! : fallbackIndex;
}

/**
 * Organizes section blocks into rows for grid rendering.
 * This ensures that blocks are rendered in row-by-row order (line 1, line 2, etc.)
 * instead of column-by-column order.
 * 
 * @param section - The page section with columns and blocks
 * @returns Array of rows, where each row contains blocks from all columns at that row index
 */
export function organizeSectionBlocksIntoRows(section: PageSection): Array<{
  rowIndex: number;
  cells: Array<{ colIndex: number; block: PageBlock } | null>;
}> {
  const columnCount = getSectionColumnCount(section);
  
  // Find the maximum row index across all columns
  let maxRowIndex = -1;
  section.cols.forEach((col) => {
    col.blocks
      .filter((block) => block.visible !== false)
      .forEach((block, blockIndex) => {
        const rowIndex = getBlockRowIndex(block, blockIndex);
        maxRowIndex = Math.max(maxRowIndex, rowIndex);
      });
  });

  // If no blocks, return empty array
  if (maxRowIndex === -1) {
    return [];
  }

  // Create a map of (colIndex, rowIndex) -> block
  const blockMap = new Map<string, PageBlock>();
  section.cols.forEach((col, colIndex) => {
    col.blocks
      .filter((block) => block.visible !== false)
      .forEach((block, blockIndex) => {
        const rowIndex = getBlockRowIndex(block, blockIndex);
        const key = `${colIndex}-${rowIndex}`;
        blockMap.set(key, block);
      });
  });

  // Build rows
  const rows: Array<{
    rowIndex: number;
    cells: Array<{ colIndex: number; block: PageBlock } | null>;
  }> = [];

  for (let rowIndex = 0; rowIndex <= maxRowIndex; rowIndex++) {
    const cells: Array<{ colIndex: number; block: PageBlock } | null> = [];
    
    for (let colIndex = 0; colIndex < columnCount; colIndex++) {
      const key = `${colIndex}-${rowIndex}`;
      const block = blockMap.get(key);
      
      if (block) {
        cells.push({ colIndex, block });
      } else {
        // Empty cell - preserve grid structure
        cells.push(null);
      }
    }
    
    rows.push({ rowIndex, cells });
  }

  return rows;
}

/**
 * Validates that blocks are correctly organized by row.
 * Useful for debugging and testing.
 */
export function validateBlockOrdering(section: PageSection): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const rows = organizeSectionBlocksIntoRows(section);
  
  // Check if all blocks have valid row indices
  section.cols.forEach((col, colIndex) => {
    col.blocks.forEach((block, blockIndex) => {
      const rowIndex = getBlockRowIndex(block, blockIndex);
      if (rowIndex !== block.rowIndex && block.rowIndex !== undefined) {
        issues.push(
          `Block ${block.id} in col ${colIndex} has inconsistent rowIndex: ` +
          `expected ${rowIndex} (fallback), got ${block.rowIndex}`
        );
      }
    });
  });

  // Check for gaps in row indices
  rows.forEach((row, index) => {
    if (row.rowIndex !== index) {
      issues.push(`Gap in row indices: expected row ${index}, got ${row.rowIndex}`);
    }
  });

  return {
    isValid: issues.length === 0,
    issues
  };
}
