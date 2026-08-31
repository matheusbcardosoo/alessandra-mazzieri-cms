import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/prisma';
import { env } from '../src/config/env';

async function run() {
  try {
    const user = await prisma.user.findUnique({ where: { email: env.ADMIN_EMAIL } });
    if (!user) {
      console.log('Admin user not found for', env.ADMIN_EMAIL);
      process.exit(1);
    }

    const matches = await bcrypt.compare(env.ADMIN_PASSWORD, user.password);
    console.log('Admin email:', env.ADMIN_EMAIL);
    console.log('Password matches hash:', matches);
    console.log('Stored hash (first 20 chars):', user.password.slice(0, 20));
  } catch (err) {
    console.error('Error checking admin:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
