import { Request, Response } from 'express';
import { auditLogService } from '../../services/auditLog.service';
import { sendSuccess } from '../../utils/responses';

export const listAuditLog = async (req: Request, res: Response) => {
  const entity = req.query.entity as string | undefined;
  const action = req.query.action as string | undefined;
  const actorId = req.query.actorId as string | undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const offset = (page - 1) * limit;

  const result = await auditLogService.list({ entity, action, actorId, startDate, endDate, limit, offset });
  const totalPages = Math.ceil(result.total / limit);

  return sendSuccess(res, { items: result.items, total: result.total, page, limit, totalPages });
};
