import { z } from 'zod';

// Schema de :id repetido em praticamente todo controller admin (pages, posts,
// nav, media, formSubmissions). Extraído aqui para não redeclarar
// `z.object({ id: z.string().uuid() }).parse(req.params)` em cada handler
// (Fase 5 do plano de template: docs/plano-template.md). Todo model do
// schema.prisma usa `@default(uuid())`, então valida como uuid — um :id que
// não é uuid é sempre inválido, não precisa chegar até o banco pra descobrir.
export const uuidParamSchema = z.object({ id: z.string().uuid() });

export function parseUuidParam(params: unknown): { id: string } {
  return uuidParamSchema.parse(params);
}
