import { Router } from 'express';
import { getNavigation } from './navigation.controller';
import { getHome } from './home.controller';
import { getPage } from './pages.controller';
import { getBlogHome, getPost, incrementView, listFeaturedPosts, listMostViewedPosts, listPosts } from './posts.controller';
import { getPublicSiteSettings } from './siteSettings.controller';
import { getTheme } from './theme.controller';
import { submitForm } from './forms.controller';
import { rateLimitMiddleware } from '../../middleware/rateLimit';

export const publicRoutes = Router();

publicRoutes.get('/public/nav', getNavigation);
publicRoutes.get('/public/navigation-items', getNavigation);
publicRoutes.get('/public/home', getHome);
publicRoutes.get('/public/pages/home', getHome);
publicRoutes.get('/public/pages/:slug', getPage);
publicRoutes.get('/public/blog/featured', listFeaturedPosts);
publicRoutes.get('/public/blog/most-viewed', listMostViewedPosts);
publicRoutes.get('/public/blog/posts', listPosts);
publicRoutes.get('/public/blog', listPosts); // legacy alias
publicRoutes.post('/public/blog/posts/:id/view', incrementView);
publicRoutes.get('/public/blog/home', getBlogHome);
publicRoutes.get('/public/blog/:slug', getPost);
publicRoutes.get('/public/theme', getTheme);
publicRoutes.get('/public/site-settings', getPublicSiteSettings);
publicRoutes.post('/public/forms/submit', rateLimitMiddleware, submitForm);
