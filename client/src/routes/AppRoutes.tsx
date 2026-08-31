import { lazy } from 'react';
import { type RouteObject } from 'react-router-dom';
import { PublicLayout } from '../components/PublicLayout';
import { HomePage } from '../pages/HomePage';
import { AboutPage } from '../pages/AboutPage';
import { ContactPage } from '../pages/ContactPage';
import { BlogPage } from '../pages/BlogPage';
import { ArticlePage } from '../pages/ArticlePage';
import { DynamicPage } from '../pages/DynamicPage';
import { AdminSuspense, RequireAuth, RequireRole, RequireSection } from './routeGuards';

/**
 * Todo o admin é lazy: Tiptap, dnd-kit, react-image-crop etc. só existem
 * pra quem edita conteúdo, mas antes disso entravam no mesmo chunk que
 * HomePage/AboutPage/etc. e eram baixados por todo visitante público. Cada
 * import() aqui vira um chunk próprio, buscado só ao navegar pra /admin/*.
 */
const AdminLayout = lazy(() => import('../components/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const AdminPagePreviewPage = lazy(() =>
  import('../pages/AdminPagePreviewPage').then((m) => ({ default: m.AdminPagePreviewPage }))
);
const AdminPagePreviewFrame = lazy(() =>
  import('../pages/AdminPagePreviewFrame').then((m) => ({ default: m.AdminPagePreviewFrame }))
);
const AdminLoginPage = lazy(() => import('../pages/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage })));
const AdminSetupPage = lazy(() => import('../pages/AdminSetupPage').then((m) => ({ default: m.AdminSetupPage })));
const AdminDashboardPage = lazy(() =>
  import('../pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);
const AdminNavbarPage = lazy(() => import('../pages/AdminNavbarPage').then((m) => ({ default: m.AdminNavbarPage })));
const AdminHomePage = lazy(() => import('../pages/AdminHomePage').then((m) => ({ default: m.AdminHomePage })));
const AdminBlogPage = lazy(() => import('../pages/AdminBlogPage').then((m) => ({ default: m.AdminBlogPage })));
const AdminPagesPage = lazy(() => import('../pages/AdminPagesPage').then((m) => ({ default: m.AdminPagesPage })));
const AdminArticlesPage = lazy(() =>
  import('../pages/AdminArticlesPage').then((m) => ({ default: m.AdminArticlesPage }))
);
const AdminArticleEditorPage = lazy(() =>
  import('../pages/AdminArticleEditorPage').then((m) => ({ default: m.AdminArticleEditorPage }))
);
const AdminPageEditorPage = lazy(() =>
  import('../pages/AdminPageEditorPage').then((m) => ({ default: m.AdminPageEditorPage }))
);
const AdminMediaPage = lazy(() => import('../pages/AdminMediaPage').then((m) => ({ default: m.AdminMediaPage })));
const AdminSettingsPage = lazy(() =>
  import('../pages/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage }))
);
const AdminFormSubmissionsPage = lazy(() =>
  import('../pages/AdminFormSubmissionsPage').then((m) => ({ default: m.AdminFormSubmissionsPage }))
);
const AdminFormSubmissionDetailPage = lazy(() =>
  import('../pages/AdminFormSubmissionDetailPage').then((m) => ({ default: m.AdminFormSubmissionDetailPage }))
);
const AdminHelpPage = lazy(() => import('../pages/AdminHelpPage').then((m) => ({ default: m.AdminHelpPage })));
const AdminHelpTutorialPage = lazy(() =>
  import('../pages/AdminHelpTutorialPage').then((m) => ({ default: m.AdminHelpTutorialPage }))
);
const AdminUsersPage = lazy(() => import('../pages/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })));
const AdminAuditLogPage = lazy(() =>
  import('../pages/AdminAuditLogPage').then((m) => ({ default: m.AdminAuditLogPage }))
);

/**
 * Árvore de rotas do client, usada por um data router (createBrowserRouter
 * em App.tsx). Precisa ser um data router — não um <BrowserRouter> simples
 * — porque o editor de páginas (AdminPageEditorPage) usa useBlocker para
 * confirmar saída com alterações não salvas, e useBlocker só funciona
 * dentro de um data router (ver
 * https://reactrouter.com/en/main/routers/picking-a-router).
 *
 * Usada apenas no client. O SSR (entry-server.tsx) usa PublicRoutes.tsx,
 * uma lista separada e mais simples (sem admin) montada com
 * <StaticRouter> — as duas listas de rotas públicas precisam ficar em
 * sincronia, ver comentário em PublicRoutes.tsx.
 */
export const appRoutes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/sobre', element: <AboutPage /> },
      { path: '/contato', element: <ContactPage /> },
      { path: '/p/:slug', element: <DynamicPage /> },
      { path: '/blog', element: <BlogPage /> },
      { path: '/blog/:slug', element: <ArticlePage /> },
      {
        path: '/admin/preview-frame',
        element: (
          <AdminSuspense>
            <RequireAuth>
              <AdminPagePreviewFrame />
            </RequireAuth>
          </AdminSuspense>
        )
      }
    ]
  },
  {
    path: '/admin/login',
    element: (
      <AdminSuspense>
        <AdminLoginPage />
      </AdminSuspense>
    )
  },
  {
    path: '/admin/setup',
    element: (
      <AdminSuspense>
        <AdminSetupPage />
      </AdminSuspense>
    )
  },
  {
    path: '/admin/preview',
    element: (
      <AdminSuspense>
        <RequireAuth>
          <AdminPagePreviewPage />
        </RequireAuth>
      </AdminSuspense>
    )
  },
  {
    path: '/admin',
    element: (
      <AdminSuspense>
        <RequireAuth>
          <AdminLayout />
        </RequireAuth>
      </AdminSuspense>
    ),
    children: [
      { index: true, element: <AdminDashboardPage /> },
      {
        path: 'navbar',
        element: (
          <RequireSection section="menu">
            <AdminNavbarPage />
          </RequireSection>
        )
      },
      { path: 'home', element: <AdminHomePage /> },
      {
        path: 'blog',
        element: (
          <RequireSection section="blog">
            <AdminBlogPage />
          </RequireSection>
        )
      },
      { path: 'pages', element: <AdminPagesPage /> },
      { path: 'pages/new', element: <AdminPageEditorPage /> },
      { path: 'pages/:id/edit', element: <AdminPageEditorPage /> },
      {
        path: 'articles',
        element: (
          <RequireSection section="blog">
            <AdminArticlesPage />
          </RequireSection>
        )
      },
      {
        path: 'articles/new',
        element: (
          <RequireSection section="blog">
            <AdminArticleEditorPage />
          </RequireSection>
        )
      },
      {
        path: 'articles/:id/edit',
        element: (
          <RequireSection section="blog">
            <AdminArticleEditorPage />
          </RequireSection>
        )
      },
      {
        path: 'media',
        element: (
          <RequireSection section="media">
            <AdminMediaPage />
          </RequireSection>
        )
      },
      {
        path: 'form-submissions',
        element: (
          <RequireSection section="forms">
            <AdminFormSubmissionsPage />
          </RequireSection>
        )
      },
      {
        path: 'form-submissions/:id',
        element: (
          <RequireSection section="forms">
            <AdminFormSubmissionDetailPage />
          </RequireSection>
        )
      },
      {
        path: 'settings',
        element: (
          <RequireSection section="settings">
            <AdminSettingsPage />
          </RequireSection>
        )
      },
      {
        path: 'usuarios',
        element: (
          <RequireRole roles={['admin', 'owner']}>
            <AdminUsersPage />
          </RequireRole>
        )
      },
      {
        path: 'auditoria',
        element: (
          <RequireRole roles={['admin', 'owner']}>
            <AdminAuditLogPage />
          </RequireRole>
        )
      },
      { path: 'ajuda', element: <AdminHelpPage /> },
      { path: 'ajuda/:id', element: <AdminHelpTutorialPage /> }
    ]
  }
];
