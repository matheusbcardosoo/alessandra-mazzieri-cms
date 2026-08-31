import { Router } from 'express';
import { getLlmsTxt, getRobotsTxt, getSitemapXml } from './seo.controller';

// Rotas na raiz do domínio (não sob /api) — robots.txt, sitemap.xml e
// llms.txt precisam estar em /robots.txt, /sitemap.xml e /llms.txt, não
// /api/robots.txt (Fase 4, docs/plano-template.md).
export const seoRoutes = Router();

seoRoutes.get('/robots.txt', getRobotsTxt);
seoRoutes.get('/sitemap.xml', getSitemapXml);
seoRoutes.get('/llms.txt', getLlmsTxt);
