import { Request, Response } from 'express';
import { z } from 'zod';
import { BLOG_SECTION_TYPES } from '../../utils/blogLayout';
import { BlogService } from '../../services/blog.service';
import { sendSuccess } from '../../utils/responses';
import { uuidParamSchema } from '../../utils/validation';

const service = new BlogService();

const blogSectionInputSchema = z.object({
  type: z.enum(BLOG_SECTION_TYPES),
  visible: z.boolean().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional()
});

// Express 5 encaminha automaticamente rejeições de handlers async para o
// error middleware — não é preciso repetir try/catch + next(error).

export async function getBlogAdmin(_req: Request, res: Response) {
  const data = await service.getAdmin();
  return sendSuccess(res, data);
}

export async function updateBlogContent(req: Request, res: Response) {
  const payload = z
    .object({
      title: z.string().optional(),
      description: z.string().optional().nullable(),
      sections: z.array(blogSectionInputSchema).optional()
    })
    .parse(req.body);
  const { id } = uuidParamSchema.parse(req.params);

  const data = await service.updateBlog(id, payload);
  return sendSuccess(res, data);
}
