import { Request, Response } from 'express';
import * as formSubmissionService from '../../services/formSubmission.service';
import { sendSuccess } from '../../utils/responses';
import { z } from 'zod';

const submitFormSchema = z.object({
  pageSlug: z.string().min(1),
  formBlockId: z.string().min(1),
  formData: z.record(z.string(), z.any()),
  honeypot: z.string().optional()
});

export const submitForm = async (req: Request, res: Response) => {
  const body = submitFormSchema.parse(req.body);

  // Simple honeypot anti-spam
  if (body.honeypot) {
    // Silently ignore spam
    return sendSuccess(res, { success: true });
  }

  const userAgent = req.get('user-agent');
  const ip = req.ip || req.socket.remoteAddress;

  const submission = await formSubmissionService.submitForm({
    pageSlug: body.pageSlug,
    formBlockId: body.formBlockId,
    formData: body.formData,
    userAgent,
    ip
  });

  return sendSuccess(res, {
    success: true,
    submissionId: submission.id
  });
};
