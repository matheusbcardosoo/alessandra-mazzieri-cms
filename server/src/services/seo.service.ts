import { env } from '../config/env';
import { cacheKeys, cacheProvider, cacheTTL } from '../config/cache';
import { PageRepository } from '../repositories/page.repository';
import { PostRepository } from '../repositories/post.repository';
import { SiteSettingsService } from './siteSettings.service';

const pageRepository = new PageRepository();
const postRepository = new PostRepository();
const siteSettingsService = new SiteSettingsService();

type PublicContentItem = {
  loc: string;
  title: string;
  description?: string | null;
  updatedAt?: Date | null;
  changefreq?: string;
  priority?: number;
  isPost: boolean;
};

// /sobre e /contato têm rota "bonita" dedicada em PublicRoutes.tsx; qualquer
// outra Page cai na rota genérica /p/:slug. Mantido aqui como única fonte da
// regra, para não duplicá-la entre sitemap e llms.txt.
function pagePublicPath(slug: string): string {
  return slug === 'sobre' || slug === 'contato' ? `/${slug}` : `/p/${slug}`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Fonte única de conteúdo público indexável: sitemap.xml e llms.txt derivam
// os dois da mesma busca em vez de cada um consultar o banco à sua maneira
// — mesmo princípio de generalização do Importante 3 (uma função que sabe
// combinar os tipos de conteúdo, não uma por formato de saída).
async function collectPublicContent(): Promise<PublicContentItem[]> {
  const [pages, posts] = await Promise.all([pageRepository.findAllPublished(), postRepository.listPublished()]);

  const staticItems: PublicContentItem[] = [
    { loc: '/', title: 'Início', changefreq: 'weekly', priority: 1.0, isPost: false },
    { loc: '/blog', title: 'Blog', changefreq: 'daily', priority: 0.8, isPost: false }
  ];

  const pageItems: PublicContentItem[] = pages.map((page) => ({
    loc: pagePublicPath(page.slug),
    title: page.title,
    description: page.description,
    updatedAt: page.updatedAt,
    changefreq: 'monthly',
    priority: 0.6,
    isPost: false
  }));

  const postItems: PublicContentItem[] = posts.map((post) => ({
    loc: `/blog/${post.slug}`,
    title: post.title,
    description: post.excerpt,
    updatedAt: post.updatedAt,
    changefreq: 'monthly',
    priority: 0.5,
    isPost: true
  }));

  return [...staticItems, ...pageItems, ...postItems];
}

function buildSitemapXml(items: PublicContentItem[], origin: string): string {
  const urls = items
    .map((item) => {
      const loc = `${origin}${item.loc}`;
      const lastmod = item.updatedAt ? `<lastmod>${item.updatedAt.toISOString().slice(0, 10)}</lastmod>` : '';
      const changefreq = item.changefreq ? `<changefreq>${item.changefreq}</changefreq>` : '';
      const priority = item.priority !== undefined ? `<priority>${item.priority.toFixed(1)}</priority>` : '';
      return `  <url><loc>${escapeXml(loc)}</loc>${lastmod}${changefreq}${priority}</url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function buildLlmsTxt(items: PublicContentItem[], origin: string, siteName: string, description: string): string {
  const pages = items.filter((item) => !item.isPost);
  const posts = items.filter((item) => item.isPost);

  const renderList = (list: PublicContentItem[]): string =>
    list.length
      ? list.map((item) => `- [${item.title}](${origin}${item.loc})${item.description ? `: ${item.description}` : ''}`).join('\n')
      : '_Nada publicado ainda._';

  return [
    `# ${siteName}`,
    '',
    `> ${description}`,
    '',
    '## Páginas',
    '',
    renderList(pages),
    '',
    '## Blog',
    '',
    renderList(posts),
    ''
  ].join('\n');
}

export class SeoService {
  // robots.txt não depende do banco — não precisa passar pelo cache
  // genérico (CacheProvider), só do ambiente. Sitemap e llms.txt, que
  // dependem do conteúdo publicado, seguem o mesmo padrão de cache das
  // demais entidades públicas (config/cache.ts).
  getRobotsTxt(): string {
    const aiTrain = env.AI_TRAINING_ALLOWED ? 'yes' : 'no';
    return [
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin',
      '',
      // Content Signals (Cloudflare): sinaliza a bots de IA se o conteúdo
      // pode ser usado em busca (search), como contexto para responder
      // perguntas (ai-input, ex. RAG/agentes) e/ou treino de modelo
      // (ai-train) — sem precisar bloquear o bot inteiro por User-agent.
      // https://developers.cloudflare.com/bots/additional-configurations/content-signals/
      `Content-Signal: search=yes, ai-input=yes, ai-train=${aiTrain}`,
      '',
      `Sitemap: ${env.SITE_URL}/sitemap.xml`,
      ''
    ].join('\n');
  }

  async getSitemapXml(): Promise<string> {
    return cacheProvider.wrap(cacheKeys.sitemap, cacheTTL.sitemap, async () => {
      const items = await collectPublicContent();
      return buildSitemapXml(items, env.SITE_URL);
    });
  }

  async getLlmsTxt(): Promise<string> {
    return cacheProvider.wrap(cacheKeys.llmsTxt, cacheTTL.llmsTxt, async () => {
      const [items, siteSettings] = await Promise.all([collectPublicContent(), siteSettingsService.getPublic()]);
      const siteName = siteSettings.siteName || 'Meu Site';
      const description =
        siteSettings.metaDescription || siteSettings.brandTagline || `Conteúdo público de ${siteName}.`;
      return buildLlmsTxt(items, env.SITE_URL, siteName, description);
    });
  }

  // Chamado pelos endpoints admin de escrita de Page/Post: regenera
  // sitemap.xml e llms.txt na mesma request em vez de só invalidar,
  // seguindo o mesmo padrão de invalidação+regeneração da Fase 3
  // (docs/plano-template.md).
  async regeneratePublicIndexes(): Promise<void> {
    const [items, siteSettings] = await Promise.all([collectPublicContent(), siteSettingsService.getPublic()]);
    const siteName = siteSettings.siteName || 'Meu Site';
    const description = siteSettings.metaDescription || siteSettings.brandTagline || `Conteúdo público de ${siteName}.`;

    await Promise.all([
      cacheProvider.set(cacheKeys.sitemap, buildSitemapXml(items, env.SITE_URL), cacheTTL.sitemap),
      cacheProvider.set(cacheKeys.llmsTxt, buildLlmsTxt(items, env.SITE_URL, siteName, description), cacheTTL.llmsTxt)
    ]);
  }
}
