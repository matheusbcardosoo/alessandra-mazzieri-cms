import type { PageLayoutV2, PageSection, PageBlock } from '../types';

/**
 * Sanitizes a page layout to ensure it's valid according to the Zod schema.
 * Removes blocks with invalid data (e.g., image blocks with empty src).
 */
export function sanitizePageLayout(layout: PageLayoutV2): PageLayoutV2 {
  if (!layout || layout.version !== 2) {
    return layout;
  }

  return {
    ...layout,
    sections: layout.sections.map(sanitizeSection).filter(section => section.cols.length > 0)
  };
}

function sanitizeSection(section: PageSection): PageSection {
  return {
    ...section,
    cols: section.cols
      .map(col => ({
        ...col,
        blocks: col.blocks.map(sanitizeBlock).filter(Boolean) as PageBlock[]
      }))
      .filter(col => col.blocks.length > 0)
  };
}

function sanitizeBlock(block: PageBlock): PageBlock | null {
  // Validate image blocks
  if (block.type === 'image') {
    const src = block.data?.src;
    if (!src || typeof src !== 'string' || src.trim().length === 0) {
      // Remove invalid image blocks (empty src)
      return null;
    }
  }

  // Validate button blocks
  if (block.type === 'button') {
    const label = block.data?.label;
    const href = block.data?.href;
    if (!label || typeof label !== 'string' || label.trim().length === 0) {
      return null;
    }
    if (!href || typeof href !== 'string' || href.trim().length === 0) {
      return null;
    }
  }

  // Validate text blocks (minimal validation - contentHtml can be empty)
  if (block.type === 'text') {
    // Text blocks are always valid
    return block;
  }

  // Validate cards blocks
  if (block.type === 'cards') {
    const items = block.data?.items;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return null;
    }
    
    // Filter out invalid items
    const validItems = items.filter(item => {
      return item.id && 
             typeof item.id === 'string' && 
             item.id.length > 0 &&
             item.title && 
             typeof item.title === 'string' && 
             item.title.length > 0 &&
             item.text && 
             typeof item.text === 'string' && 
             item.text.length > 0;
    });

    if (validItems.length === 0) {
      return null;
    }

    return {
      ...block,
      data: {
        ...block.data,
        items: validItems
      }
    };
  }

  // Validate recentPosts blocks (minimal validation)
  if (block.type === 'recent-posts') {
    return block;
  }

  // Validate services blocks
  if (block.type === 'services') {
    const sectionTitle = block.data?.sectionTitle;
    const items = block.data?.items;
    if (!sectionTitle || typeof sectionTitle !== 'string' || sectionTitle.trim().length === 0) {
      return null;
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return null;
    }

    const validItems = items.filter((item) => {
      return item?.id &&
        typeof item.id === 'string' &&
        item.id.length > 0 &&
        item.title &&
        typeof item.title === 'string' &&
        item.title.trim().length > 0 &&
        item.href &&
        typeof item.href === 'string' &&
        item.href.trim().length > 0;
    });

    if (validItems.length === 0) {
      return null;
    }

    return {
      ...block,
      data: {
        ...block.data,
        sectionTitle: sectionTitle.trim(),
        items: validItems.map((item) => ({
          ...item,
          description: item.description ? String(item.description).trim() : undefined
        }))
      }
    };
  }

  // For other block types, pass through
  return block;
}
