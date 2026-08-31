export type NavigationItemType = 'INTERNAL_PAGE' | 'EXTERNAL_URL';

export type NavbarItem = {
  id: string;
  label: string;
  type: NavigationItemType;
  pageKey?: string | null;
  url?: string | null;
  isParent: boolean;
  showInNavbar: boolean;
  showInFooter: boolean;
  parentId?: string | null;
  orderNavbar: number;
  orderFooter?: number | null;
  isVisible: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type UserRole = 'admin' | 'owner' | 'editor';

export type SectionKey = 'blog' | 'menu' | 'media' | 'forms' | 'settings';

export type SectionAccess = Record<SectionKey, boolean>;

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  sectionAccess: SectionAccess;
  canAccessHome: boolean;
};

export type ManagedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  sectionAccess: SectionAccess;
  pageAccess: string[];
};

export type Media = {
  id: string;
  url: string;
  avifUrl?: string | null;
  path?: string;
  bucket?: string;
  alt?: string | null;
  title?: string | null;
  description?: string | null;
  tags?: string[];
  mimeType: string;
  size: number;
  width?: number | null;
  height?: number | null;
  cropX?: number | null;
  cropY?: number | null;
  cropWidth?: number | null;
  cropHeight?: number | null;
  cropRatio?: '16:9' | '9:16' | '1:1' | '4:3' | 'free' | null;
};

export type SocialLink = {
  id: string;
  platform:
    | 'instagram'
    | 'whatsapp'
    | 'facebook'
    | 'linkedin'
    | 'youtube'
    | 'tiktok'
    | 'x'
    | 'site'
    | 'email'
    | 'telefone'
    | 'custom';
  label?: string | null;
  url: string;
  order: number;
  isVisible: boolean;
};
