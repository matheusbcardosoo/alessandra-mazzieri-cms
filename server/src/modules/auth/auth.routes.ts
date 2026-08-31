import { Router } from 'express';
import * as controller from './auth.controller';
import { requireAuth } from '../../middleware/auth';

export const authRoutes = Router();

authRoutes.post('/login', controller.login);
authRoutes.post('/logout', controller.logout);
authRoutes.get('/admin/me', requireAuth, controller.getCurrentUser);
authRoutes.get('/setup/status', controller.getSetupStatus);
authRoutes.post('/setup/admin', controller.createFirstAdmin);
