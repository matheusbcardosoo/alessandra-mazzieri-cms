import { Request, Response } from 'express';
import * as formSubmissionService from '../../services/formSubmission.service';
import { sendSuccess } from '../../utils/responses';

export const listFormSubmissions = async (req: Request, res: Response) => {
  const pageId = req.query.pageId as string | undefined;
  const formBlockId = req.query.formBlockId as string | undefined;
  const search = req.query.search as string | undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const offset = (page - 1) * limit;

  const result = await formSubmissionService.listSubmissions({
    pageId,
    formBlockId,
    search,
    startDate,
    endDate,
    limit,
    offset
  });

  // Calcular totalPages para paginação
  const totalPages = Math.ceil(result.total / limit);

  return sendSuccess(res, {
    submissions: result.submissions,
    total: result.total,
    page,
    limit,
    totalPages
  });
};

export const getFormSubmission = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const submission = await formSubmissionService.getSubmission(id);
  return sendSuccess(res, submission);
};

export const deleteFormSubmission = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await formSubmissionService.removeSubmission(id, req.user!);
  return sendSuccess(res, { success: true });
};
