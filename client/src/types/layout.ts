import type { PageBlock } from './blocks';

export type PageStatus = 'draft' | 'published';

export type HomeSection = {
  id: string;
  type: string;
  title?: string | null;
  data: Record<string, unknown>;
  order: number;
  visible: boolean;
  isLocked?: boolean;
};

export type PageLayoutV1 = {
  version: 1;
  columns: 1 | 2 | 3;
  cols: Array<{ id?: string; blocks: PageBlock[] }>;
};

export type BackgroundImageConfig = {
  mediaId: string;
  url: string;
  overlayOpacity?: number;
  overlayColor?: 'dark' | 'light';
};

export type PageSection = {
  id: string;
  kind?: 'normal' | 'hero';
  columns: 1 | 2 | 3;
  columnsLayout?: 2 | 3;
  cols: Array<{ id: string; blocks: PageBlock[] }>;
  settings?: {
    background?: 'none' | 'soft' | 'dark' | 'earthy';
    backgroundStyle?: 'none' | 'soft' | 'dark' | 'earthy';
    padding?: 'normal' | 'compact' | 'large';
    density?: 'compact' | 'normal' | 'large';
    height?: 'normal' | 'tall';
    hidden?: boolean;
    name?: string;
    anchorId?: string;
    backgroundColor?: string;
    backgroundMode?: 'none' | 'color' | 'image';
    backgroundImage?: BackgroundImageConfig;
    columnGap?: 'sm' | 'md' | 'lg';
    verticalAlign?: 'top' | 'center' | 'bottom';
    maxWidth?: 'normal' | 'wide';
    width?: 'normal' | 'wide';
    columnsLayout?: 2 | 3;
  };
};

export type PageLayoutV2 = {
  version: 2;
  sections: PageSection[];
};

export type PageLayout = PageLayoutV1 | PageLayoutV2;

export type Page = {
  id: string;
  slug: string;
  pageKey?: string | null;
  title: string;
  description?: string | null;
  layout: PageLayout;
  status: PageStatus;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type MissingMediaRef = {
  blockId: string;
  mediaId: string;
};

export type PageVersion = {
  id: string;
  pageId: string;
  title: string;
  description?: string | null;
  layout: PageLayout;
  publishedAt: string;
  actorId?: string | null;
  actorName: string;
  actorEmail: string;
  missingMedia: MissingMediaRef[];
};
