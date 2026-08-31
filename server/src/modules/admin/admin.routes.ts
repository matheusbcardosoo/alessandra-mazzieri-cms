import { Request, Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requirePageAccess, requireRole, requireSection } from '../../middleware/permissions';
import { createNav, deleteNav, listNav, reorderNav, updateNav } from './navigation.controller';
import { ensureHome, getHomeAdmin, updateHomeContent } from './home.controller';
import { getBlogAdmin, updateBlogContent } from './blog.controller';
import {
  createPage,
  deletePage,
  getPageAdmin,
  getPageMissingMedia,
  listPages,
  listPageVersions,
  publishPage,
  revertPageVersion,
  unpublishPage,
  updatePage
} from './pages.controller';
import { createPost, deletePost, listPostsAdmin, publishPost, unpublishPost, updatePost } from './posts.controller';
import { getSiteSettingsAdmin, updateSiteSettings } from './siteSettings.controller';
import { deleteFormSubmission, getFormSubmission, listFormSubmissions } from './formSubmissions.controller';
import { listAuditLog } from './auditLog.controller';
import { getDashboardMetrics } from './metrics.controller';
import { usersRoutes } from './users.routes';
import { HomeService } from '../../services/home.service';

const homeService = new HomeService();

async function resolveHomePageId(): Promise<string> {
  return (await homeService.getAdmin()).id;
}

async function resolveParamPageId(req: Request): Promise<string> {
  return req.params.id as string;
}

export const adminRoutes = Router();

adminRoutes.use(requireAuth);

// Dashboard — sempre visível a qualquer papel autenticado, sem toggle.
adminRoutes.get('/admin/metrics', getDashboardMetrics);

// Gerenciamento de usuários — só admin/owner (checado dentro de usersRoutes).
adminRoutes.use('/admin/users', usersRoutes);

// Log de auditoria — leitura restrita a admin/owner, sem toggle de seção
// (não é uma permissão delegável a editor).
adminRoutes.get('/admin/audit-log', requireRole('admin', 'owner'), listAuditLog);

// Menu (navegação) — toggle de seção.
const menuPaths = ['/navigation-items', '/admin/nav'];
adminRoutes.use(menuPaths, requireSection('menu'));
adminRoutes.get('/navigation-items', listNav);
adminRoutes.post('/navigation-items', createNav);
adminRoutes.patch('/navigation-items/reorder', reorderNav);
adminRoutes.patch('/navigation-items/:id', updateNav);
adminRoutes.delete('/navigation-items/:id', deleteNav);
adminRoutes.get('/admin/nav', listNav);
adminRoutes.post('/admin/nav', createNav);
adminRoutes.put('/admin/nav/:id', updateNav);
adminRoutes.patch('/admin/nav/:id', updateNav);
adminRoutes.delete('/admin/nav/:id', deleteNav);

// Página inicial (home) — é uma Page de verdade (pageKey 'home'), então usa
// acesso por página, resolvido pelo id real da home, não um toggle de seção.
const homePaths = ['/admin/home', '/admin/pages/ensure-home'];
adminRoutes.use(homePaths, requirePageAccess(resolveHomePageId));
adminRoutes.get('/admin/home', getHomeAdmin);
adminRoutes.put('/admin/home/:id', updateHomeContent);
adminRoutes.post('/admin/pages/ensure-home', ensureHome);

// Blog (config + Artigos) — mesmo toggle de seção para as duas telas.
const blogPaths = ['/admin/blog', '/admin/posts', '/articles'];
adminRoutes.use(blogPaths, requireSection('blog'));
adminRoutes.get('/admin/blog', getBlogAdmin);
adminRoutes.put('/admin/blog/:id', updateBlogContent);
adminRoutes.get('/admin/posts', listPostsAdmin);
adminRoutes.post('/admin/posts', createPost);
adminRoutes.put('/admin/posts/:id', updatePost);
adminRoutes.delete('/admin/posts/:id', deletePost);
adminRoutes.patch('/admin/posts/:id/publish', publishPost);
adminRoutes.patch('/admin/posts/:id/unpublish', unpublishPost);
adminRoutes.get('/articles', listPostsAdmin);
adminRoutes.post('/articles', createPost);
adminRoutes.patch('/articles/:id', updatePost);
adminRoutes.delete('/articles/:id', deletePost);
adminRoutes.post('/articles/:id/publish', publishPost);
adminRoutes.post('/articles/:id/unpublish', unpublishPost);

// Páginas — acesso por página individual, não um toggle de seção. Listar
// filtra dentro do controller; criar exige admin/owner (editor não cria do
// zero); as demais operações checam a página específica pelo :id.
adminRoutes.get('/admin/pages', listPages);
adminRoutes.post('/admin/pages', requireRole('admin', 'owner'), createPage);
adminRoutes.get('/admin/pages/:id', requirePageAccess(resolveParamPageId), getPageAdmin);
adminRoutes.put('/admin/pages/:id', requirePageAccess(resolveParamPageId), updatePage);
adminRoutes.post('/admin/pages/:id/publish', requirePageAccess(resolveParamPageId), publishPage);
adminRoutes.post('/admin/pages/:id/unpublish', requirePageAccess(resolveParamPageId), unpublishPage);
adminRoutes.delete('/admin/pages/:id', requirePageAccess(resolveParamPageId), deletePage);
adminRoutes.get('/admin/pages/:id/missing-media', requirePageAccess(resolveParamPageId), getPageMissingMedia);
// Histórico de versões publicadas — mesma rota genérica de páginas serve a
// Home também (seu id é um Page id de verdade, só o endpoint de edição que é
// dedicado em /admin/home).
adminRoutes.get('/admin/pages/:id/versions', requirePageAccess(resolveParamPageId), listPageVersions);
adminRoutes.post('/admin/pages/:id/versions/:versionId/revert', requirePageAccess(resolveParamPageId), revertPageVersion);

// Configurações do site — toggle de seção.
adminRoutes.use('/admin/site-settings', requireSection('settings'));
adminRoutes.get('/admin/site-settings', getSiteSettingsAdmin);
adminRoutes.patch('/admin/site-settings', updateSiteSettings);

// Formulários — toggle de seção.
adminRoutes.use('/admin/form-submissions', requireSection('forms'));
adminRoutes.get('/admin/form-submissions', listFormSubmissions);
adminRoutes.get('/admin/form-submissions/:id', getFormSubmission);
adminRoutes.delete('/admin/form-submissions/:id', deleteFormSubmission);
