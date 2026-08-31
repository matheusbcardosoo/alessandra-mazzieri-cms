import { Request, Response } from 'express';
import { z } from 'zod';
import { NavigationService } from '../../services/navigation.service';
import { sendSuccess } from '../../utils/responses';
import { uuidParamSchema } from '../../utils/validation';

const service = new NavigationService();

const baseFields = {
  label: z.string().min(2),
  type: z.enum(['INTERNAL_PAGE', 'EXTERNAL_URL']),
  pageKey: z.string().min(1).optional().nullable(),
  url: z.string().min(1).optional().nullable(),
  showInNavbar: z.boolean().optional(),
  showInFooter: z.boolean().optional(),
  isParent: z.boolean().optional(),
  parentId: z.string().uuid().optional().nullable(),
  orderNavbar: z.coerce.number().int().nonnegative().optional().nullable(),
  orderFooter: z.coerce.number().int().nonnegative().optional().nullable(),
  isVisible: z.boolean().optional()
};

function validateNavRefs(data: Record<string, unknown>, ctx: z.RefinementCtx) {
  if (data.type === 'INTERNAL_PAGE' && !data.pageKey) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe pageKey para paginas internas', path: ['pageKey'] });
  }
  if (data.type === 'EXTERNAL_URL' && !data.url) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe url para links externos', path: ['url'] });
  }
  if (data.isParent && data.parentId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Itens pai precisam ficar no nível raiz', path: ['parentId'] });
  }
}

const createSchema = z.object(baseFields).superRefine(validateNavRefs);

const updateSchema = z
  .object({
    ...Object.fromEntries(Object.entries(baseFields).map(([key, schema]) => [key, (schema as z.ZodTypeAny).optional()]))
  })
  .superRefine(validateNavRefs);

const reorderSchema = z.object({
  context: z.enum(['navbar', 'footer']),
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        parentId: z.string().uuid().nullable().optional(),
        order: z.coerce.number().int().nonnegative()
      })
    )
    .min(1)
});

// Express 5 encaminha automaticamente rejeições de handlers async para o
// error middleware — não é preciso repetir try/catch + next(error) em cada
// handler (Fase 5 do plano de template: docs/plano-template.md).

export async function listNav(_req: Request, res: Response) {
  const data = await service.listAdmin();
  return sendSuccess(res, data);
}

export async function createNav(req: Request, res: Response) {
  const payload = createSchema.parse(req.body);
  const data = await service.create(payload, req.user!);
  return sendSuccess(res, data, 201);
}

export async function updateNav(req: Request, res: Response) {
  const payload = updateSchema.parse(req.body);
  const { id } = uuidParamSchema.parse(req.params);
  const data = await service.update(id, payload, req.user!);
  return sendSuccess(res, data);
}

export async function deleteNav(req: Request, res: Response) {
  const { id } = uuidParamSchema.parse(req.params);
  await service.delete(id, req.user!);
  return sendSuccess(res, { deleted: true });
}

export async function reorderNav(req: Request, res: Response) {
  const payload = reorderSchema.parse(req.body);
  const data = await service.reorder(payload.context, payload.items, req.user!);
  return sendSuccess(res, data);
}
