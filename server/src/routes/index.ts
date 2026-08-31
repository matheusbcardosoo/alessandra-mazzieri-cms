import { Router } from 'express';
import { authRoutes } from '../modules/auth/auth.routes';
import { publicRoutes } from '../modules/public/public.routes';
import { seoRoutes } from '../modules/public/seo.routes';
import { adminRoutes } from '../modules/admin/admin.routes';
import { mediaRoutes } from '../modules/media/media.routes';

export const routes = Router();

// robots.txt, sitemap.xml e llms.txt vivem na raiz do domínio, não sob /api.
routes.use(seoRoutes);

routes.use('/api', authRoutes);
routes.use('/api', publicRoutes);
routes.use('/api', adminRoutes);
routes.use('/api', mediaRoutes);
