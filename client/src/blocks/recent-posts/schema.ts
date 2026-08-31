export type { RecentPostsBlockData } from '@/types';
import type { RecentPostsBlockData } from '@/types';

export const recentPostsDefault: RecentPostsBlockData = {
  title: 'Conteúdos recentes',
  subtitle: 'Leituras curtas para acompanhar você entre as sessões.',
  ctaLabel: 'Ver todos os artigos',
  ctaHref: '/blog',
  postsLimit: 3
};
