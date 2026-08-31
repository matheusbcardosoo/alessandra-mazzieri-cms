import type { PageLayoutV2 } from '@/types';

export const PAGE_PREVIEW_STORAGE_KEY = 'admin:page-preview-draft';

export type PagePreviewPayload = {
  title: string;
  slug: string;
  layout: PageLayoutV2;
  isHomePage: boolean;
};

/**
 * sessionStorage é herdado por abas abertas via window.open() a partir da
 * mesma origem (e por iframes same-origin dentro delas), então a preview
 * não precisa salvar nada no servidor para refletir alterações ainda não
 * publicadas.
 */
export function openPagePreview(payload: PagePreviewPayload) {
  sessionStorage.setItem(PAGE_PREVIEW_STORAGE_KEY, JSON.stringify(payload));
  window.open('/admin/preview', '_blank');
}

export function readPagePreview(): PagePreviewPayload | null {
  try {
    const raw = sessionStorage.getItem(PAGE_PREVIEW_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PagePreviewPayload;
  } catch {
    return null;
  }
}
