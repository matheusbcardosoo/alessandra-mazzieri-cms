import { UserRole } from '@prisma/client';
import { logger } from '../config/logger';
import type { SectionAccess } from '../middleware/permissions';

declare global {
  namespace Express {
    interface AuthenticatedUser {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      sectionAccess: SectionAccess;
    }

    interface Request {
      user?: AuthenticatedUser;
      id: string;
      log: typeof logger;
    }
  }
}

export {};
