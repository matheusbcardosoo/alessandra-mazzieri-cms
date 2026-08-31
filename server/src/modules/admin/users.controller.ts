import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { sendSuccess } from '../../utils/responses';
import { HttpError } from '../../utils/errors';
import { uuidParamSchema } from '../../utils/validation';
import { SECTION_KEYS, type SectionAccess } from '../../middleware/permissions';
import { auditLogService } from '../../services/auditLog.service';

const sectionAccessSchema = z.object({
  blog: z.boolean(),
  menu: z.boolean(),
  media: z.boolean(),
  forms: z.boolean(),
  settings: z.boolean()
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(['owner', 'editor']),
  sectionAccess: sectionAccessSchema,
  pageAccess: z.array(z.string().uuid())
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  password: z.string().min(6).optional(),
  sectionAccess: sectionAccessSchema.optional(),
  pageAccess: z.array(z.string().uuid()).optional(),
  role: z.string().optional() // present only so we can detect+reject an attempted role change
});

type UserWithAccess = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  sectionAccess: unknown;
  pageAccess: { pageId: string }[];
};

function toPublicUser(user: UserWithAccess) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    sectionAccess: user.sectionAccess,
    pageAccess: user.pageAccess.map((p) => p.pageId)
  };
}

async function assertDelegatable(manager: Express.AuthenticatedUser, sectionAccess: SectionAccess, pageAccess: string[]) {
  if (manager.role === 'admin') return;

  for (const key of SECTION_KEYS) {
    if (sectionAccess[key] && !manager.sectionAccess?.[key]) {
      throw new HttpError(400, `Você não pode conceder acesso à seção "${key}" porque você mesmo não tem.`);
    }
  }

  if (pageAccess.length > 0) {
    const ownRows = await prisma.userPageAccess.findMany({ where: { userId: manager.id }, select: { pageId: true } });
    const ownPageIds = new Set(ownRows.map((r) => r.pageId));
    const notOwned = pageAccess.filter((id) => !ownPageIds.has(id));
    if (notOwned.length > 0) {
      throw new HttpError(400, 'Você não pode conceder acesso a uma página que você mesmo não tem.');
    }
  }
}

export async function listUsers(req: Request, res: Response) {
  const roleFilter: UserRole[] = req.user!.role === 'admin' ? [UserRole.owner, UserRole.editor] : [UserRole.editor];
  const users = await prisma.user.findMany({
    where: { role: { in: roleFilter } },
    orderBy: { createdAt: 'asc' },
    include: { pageAccess: true }
  });
  return sendSuccess(res, users.map(toPublicUser));
}

export async function createUser(req: Request, res: Response) {
  const payload = createUserSchema.parse(req.body);
  const manager = req.user!;

  if (manager.role === 'owner' && payload.role !== 'editor') {
    throw new HttpError(400, 'Owner só pode criar contas de editor.');
  }

  if (payload.role === 'owner') {
    const existingOwner = await prisma.user.findFirst({ where: { role: UserRole.owner } });
    if (existingOwner) {
      throw new HttpError(409, 'Este site já tem um owner. Remova o atual antes de criar outro.');
    }
  }

  await assertDelegatable(manager, payload.sectionAccess, payload.pageAccess);

  const existingEmail = await prisma.user.findUnique({ where: { email: payload.email } });
  if (existingEmail) {
    throw new HttpError(409, 'Já existe uma conta com este e-mail.');
  }

  const password = await bcrypt.hash(payload.password, 10);
  const created = await prisma.user.create({
    data: {
      email: payload.email,
      password,
      name: payload.name,
      role: payload.role as UserRole,
      sectionAccess: payload.sectionAccess,
      pageAccess: { create: payload.pageAccess.map((pageId) => ({ pageId })) }
    },
    include: { pageAccess: true }
  });

  await auditLogService.record({
    actor: manager,
    action: 'create',
    entity: 'user',
    entityId: created.id,
    entityLabel: created.name
  });

  return sendSuccess(res, toPublicUser(created), 201);
}

export async function updateUser(req: Request, res: Response) {
  const { id } = uuidParamSchema.parse(req.params);
  const payload = updateUserSchema.parse(req.body);
  const manager = req.user!;

  if (id === manager.id) {
    throw new HttpError(403, 'Você não pode editar suas próprias permissões.');
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.role === UserRole.admin) {
    throw new HttpError(404, 'Usuário não encontrado.');
  }
  if (manager.role === 'owner' && target.role !== UserRole.editor) {
    throw new HttpError(403, 'Owner só pode editar contas de editor.');
  }
  if (payload.role !== undefined && payload.role !== target.role) {
    throw new HttpError(400, 'role não pode ser alterado depois de criado — crie uma nova conta.');
  }

  if (payload.sectionAccess || payload.pageAccess) {
    await assertDelegatable(
      manager,
      (payload.sectionAccess ?? (target.sectionAccess as SectionAccess)) as SectionAccess,
      payload.pageAccess ?? []
    );
  }

  const data: Record<string, unknown> = {};
  if (payload.name !== undefined) data.name = payload.name;
  if (payload.password !== undefined) data.password = await bcrypt.hash(payload.password, 10);
  if (payload.sectionAccess !== undefined) data.sectionAccess = payload.sectionAccess;
  if (payload.pageAccess !== undefined) {
    data.pageAccess = {
      deleteMany: {},
      create: payload.pageAccess.map((pageId) => ({ pageId }))
    };
  }

  const updated = await prisma.user.update({ where: { id }, data, include: { pageAccess: true } });

  await auditLogService.record({
    actor: manager,
    action: 'update',
    entity: 'user',
    entityId: updated.id,
    entityLabel: updated.name
  });

  return sendSuccess(res, toPublicUser(updated));
}

export async function deleteUser(req: Request, res: Response) {
  const { id } = uuidParamSchema.parse(req.params);
  const manager = req.user!;

  if (id === manager.id) {
    throw new HttpError(403, 'Você não pode remover sua própria conta.');
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.role === UserRole.admin) {
    throw new HttpError(404, 'Usuário não encontrado.');
  }
  if (manager.role === 'owner' && target.role !== UserRole.editor) {
    throw new HttpError(403, 'Owner só pode remover contas de editor.');
  }

  await prisma.user.delete({ where: { id } });

  await auditLogService.record({
    actor: manager,
    action: 'delete',
    entity: 'user',
    entityId: target.id,
    entityLabel: target.name
  });

  return sendSuccess(res, { deleted: true });
}
