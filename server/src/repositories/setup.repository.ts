import { User } from '@prisma/client';
import { prisma } from '../config/prisma';

const DEFAULT_SETTINGS_ID = 'default';

export class SetupRepository {
  /**
   * needsSetup checks both the claim flag AND actual User existence — not
   * just the flag. A database that got its first admin some other way (e.g.
   * `prisma db seed`, or a pre-existing deployment migrated onto a schema
   * version that added setupCompletedAt) has a real admin but a still-null
   * flag; trusting the flag alone would let the wizard reopen and create a
   * second admin, which is exactly what must never happen.
   */
  async needsSetup(): Promise<boolean> {
    const [settings, userCount] = await Promise.all([
      prisma.siteSettings.findUnique({ where: { id: DEFAULT_SETTINGS_ID } }),
      prisma.user.count()
    ]);
    return userCount === 0 && settings?.setupCompletedAt == null;
  }

  /**
   * Atomically claims the one-time setup slot and creates the first admin
   * user. Returns null (no user created) when a User already exists (see
   * needsSetup above for why that check can't be skipped) or when another
   * request already claimed the flag — the SiteSettings singleton row is
   * upserted first so the conditional claim below always has a row to match
   * against, even on a brand-new database that has never been touched. All
   * steps share one transaction with the user creation, so a failed user
   * create rolls the claim back too.
   */
  async claimAndCreateAdmin(input: { name: string; email: string; passwordHash: string }): Promise<User | null> {
    return prisma.$transaction(async (tx) => {
      const existingUsers = await tx.user.count();
      if (existingUsers > 0) {
        return null;
      }

      await tx.siteSettings.upsert({
        where: { id: DEFAULT_SETTINGS_ID },
        create: { id: DEFAULT_SETTINGS_ID, siteName: 'Meu Site' },
        update: {}
      });

      const claim = await tx.siteSettings.updateMany({
        where: { id: DEFAULT_SETTINGS_ID, setupCompletedAt: null },
        data: { setupCompletedAt: new Date() }
      });

      if (claim.count === 0) {
        return null;
      }

      return tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          password: input.passwordHash,
          role: 'admin'
        }
      });
    });
  }
}
