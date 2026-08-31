import { prisma } from '../config/prisma';
import { User } from '@prisma/client';

export class UserRepository {
  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }
}
