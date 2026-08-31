import { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

type Part = 'body' | 'query' | 'params';

export const validate =
  (schema: ZodTypeAny, part: Part = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      return next(result.error);
    }

    (req as unknown as Record<string, unknown>)[part] = result.data;
    return next();
  };
