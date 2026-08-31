import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

export const createSubmission = async (data: {
  pageId: string;
  formBlockId: string;
  data: Record<string, unknown>;
  summary?: Record<string, unknown>;
  userAgent?: string;
  ip?: string;
}) => {
  return prisma.formSubmission.create({
    data: {
      pageId: data.pageId,
      formBlockId: data.formBlockId,
      data: data.data as Prisma.InputJsonValue,
      summary: data.summary ? (data.summary as Prisma.InputJsonValue) : undefined,
      userAgent: data.userAgent,
      ip: data.ip
    }
  });
};

export const findSubmissions = async (filters?: {
  pageId?: string;
  formBlockId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) => {
  const where: Prisma.FormSubmissionWhereInput = {};
  
  if (filters?.pageId) where.pageId = filters.pageId;
  if (filters?.formBlockId) where.formBlockId = filters.formBlockId;
  
  // Filtro de busca por texto no summary ou data
  if (filters?.search) {
    where.OR = [
      {
        summary: {
          path: [],
          string_contains: filters.search
        }
      },
      {
        data: {
          path: [],
          string_contains: filters.search
        }
      }
    ];
  }
  
  // Filtro por período
  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      // Adicionar 1 dia para incluir todo o dia final
      const endDate = new Date(filters.endDate);
      endDate.setDate(endDate.getDate() + 1);
      where.createdAt.lt = endDate;
    }
  }

  const [total, submissions] = await Promise.all([
    prisma.formSubmission.count({ where }),
    prisma.formSubmission.findMany({
      where,
      include: { page: true },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit ?? 50,
      skip: filters?.offset ?? 0
    })
  ]);

  return { submissions, total };
};

export const findSubmissionById = async (id: string) => {
  return prisma.formSubmission.findUnique({
    where: { id },
    include: { page: true }
  });
};

export const deleteSubmission = async (id: string) => {
  return prisma.formSubmission.delete({ where: { id } });
};
