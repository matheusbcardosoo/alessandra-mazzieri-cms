import { env } from './env';
import { CacheProvider } from '../infra/cache/CacheProvider';
import { RedisCacheProvider } from '../infra/cache/RedisCacheProvider';
import { MemoryCacheProvider } from '../infra/cache/MemoryCacheProvider';

export const cacheProvider: CacheProvider = env.REDIS_URL
  ? new RedisCacheProvider(env.REDIS_URL, env.REDIS_PREFIX)
  : new MemoryCacheProvider();

export const cacheTTL = {
  nav: env.CACHE_TTL_NAV,
  home: env.CACHE_TTL_HOME,
  blog: env.CACHE_TTL_BLOG,
  page: env.CACHE_TTL_PAGE,
  post: env.CACHE_TTL_POST,
  postsList: env.CACHE_TTL_POSTS_LIST,
  featuredPosts: env.CACHE_TTL_POSTS_LIST,
  mostViewedPosts: env.CACHE_TTL_POSTS_LIST,
  siteSettings: 3600,
  blogHome: 120,
  sitemap: env.CACHE_TTL_PAGE,
  llmsTxt: env.CACHE_TTL_PAGE,
  viewDedupe: env.CACHE_TTL_VIEW_DEDUPE
};

export const cacheKeys = {
  nav: 'nav:public',
  home: 'home:public',
  blog: 'blog:public',
  siteSettings: 'site-settings:public',
  blogHome: 'posts:blog-home',
  postsList: 'posts:list:published',
  postsFeatured: 'posts:list:featured',
  postsMostViewed: 'posts:list:most-viewed',
  post: (slug: string) => `post:public:${slug}`,
  page: (slug: string) => `page:public:${slug}`,
  postViewSeen: (id: string, viewerKey: string) => `post:view-seen:${id}:${viewerKey}`,
  sitemap: 'seo:sitemap',
  llmsTxt: 'seo:llms-txt'
};
