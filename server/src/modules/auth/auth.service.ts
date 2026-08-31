import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { HttpError } from '../../utils/errors';
import { UserRepository } from '../../repositories/user.repository';
import { SetupRepository } from '../../repositories/setup.repository';

const repository = new UserRepository();
const setupRepository = new SetupRepository();

export async function login(email: string, password: string) {
  const user = await repository.findByEmail(email);
  if (!user) {
    throw new HttpError(401, 'Invalid credentials');
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new HttpError(401, 'Invalid credentials');
  }

  const token = jwt.sign({ id: user.id }, env.JWT_SECRET, {
    expiresIn: '2h'
  });

  return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
}

export async function getSetupStatus() {
  const needsSetup = await setupRepository.needsSetup();
  return { needsSetup };
}

export async function createFirstAdmin(input: { name: string; email: string; password: string }) {
  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await setupRepository.claimAndCreateAdmin({ name: input.name, email: input.email, passwordHash });

  if (!user) {
    throw new HttpError(409, 'Setup already completed');
  }

  const token = jwt.sign({ id: user.id }, env.JWT_SECRET, {
    expiresIn: '2h'
  });

  return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
}
