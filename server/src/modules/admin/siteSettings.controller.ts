import { Request, Response } from 'express';
import { z } from 'zod';
import { SiteSettingsService } from '../../services/siteSettings.service';
import { sendSuccess } from '../../utils/responses';
import { siteThemePresetValues } from '../../utils/siteTheme';

const service = new SiteSettingsService();

const cnpjSchema = z
  .string()
  .optional()
  .transform((value) => (value ? value.replace(/\D/g, '') : undefined))
  .refine((value) => !value || value.length === 14, 'CNPJ deve ter 14 dígitos');

const socialPlatforms = [
  'instagram',
  'whatsapp',
  'facebook',
  'linkedin',
  'youtube',
  'tiktok',
  'x',
  'site',
  'email',
  'telefone',
  'custom'
] as const;

const urlSchema = z
  .string()
  .min(3)
  .refine((value) => {
    if (/^mailto:/i.test(value)) return true;
    if (/^tel:/i.test(value)) return true;
    try {
      // Allow http/https and wa.me links
      const parsed = new URL(value);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }, 'URL inválida');

const socialLinkSchema = z.object({
  id: z.string().uuid(),
  platform: z.enum(socialPlatforms),
  label: z.string().optional(),
  url: urlSchema,
  order: z.number().int(),
  isVisible: z.boolean().default(true)
});

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor deve estar no formato #RRGGBB');

const blogElementSchema = z.object({
  titleColor: hexColorSchema.nullable(),
  subtitleColor: hexColorSchema.nullable(),
  gradientStart: hexColorSchema.nullable(),
  gradientEnd: hexColorSchema.nullable()
}).partial();

const themeElementsSchema = z.object({
  blog: blogElementSchema,
  blogPage: blogElementSchema
}).partial().optional();

const themeSchema = z.object({
  preset: z.enum(siteThemePresetValues),
  colors: z.object({
    background: hexColorSchema,
    text: hexColorSchema,
    primary: hexColorSchema,
    accent: hexColorSchema
  }).partial(),
  typography: z.object({
    headingFont: z.string().nullable(),
    bodyFont: z.string().nullable()
  }).partial().optional(),
  elements: themeElementsSchema
}).partial();

const settingsSchema = z.object({
  siteName: z.string().min(2),
  cnpj: cnpjSchema.nullable().optional(),
  professionalRegistration: z.string().trim().max(32).nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  socials: z.array(socialLinkSchema).optional(),
  whatsappEnabled: z.boolean().optional(),
  whatsappLink: z.string().min(3).nullable().optional(),
  whatsappMessage: z.string().nullable().optional(),
  whatsappPosition: z.enum(['right', 'left']).optional(),
  hideScheduleCta: z.boolean().optional(),
  brandTagline: z.string().max(80).nullable().optional(),
  theme: themeSchema.nullable().optional(),
  address: z.object({
    street: z.string().max(200).optional(),
    neighborhood: z.string().max(100).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(2).optional(),
    zip: z.string().max(9).optional()
  }).nullable().optional(),
  officeHours: z.array(z.object({
    label: z.string().max(50),
    hours: z.string().max(50)
  })).max(10).nullable().optional(),
  metaDescription: z.string().max(320).nullable().optional(),
  ogImageUrl: z.string().url().nullable().optional(),
  gaId: z.string().max(30).regex(/^(G-[A-Z0-9]+|UA-\d+-\d+)?$/, 'ID do Google Analytics inválido').nullable().optional(),
  gscVerification: z.string().max(100).nullable().optional()
});

// Express 5 encaminha automaticamente rejeições de handlers async para o
// error middleware — não é preciso repetir try/catch + next(error) em cada
// handler (Fase 5 do plano de template: docs/plano-template.md).

export async function getSiteSettingsAdmin(_req: Request, res: Response) {
  const data = await service.getAdmin();
  return sendSuccess(res, data);
}

export async function updateSiteSettings(req: Request, res: Response) {
  const payload = settingsSchema.parse(req.body);
  // SiteSettingsService.update() já regenera o cache público (Redis/memória)
  // na mesma request — ver Fase 3 do plano de template.
  const data = await service.update(payload, req.user!);

  return sendSuccess(res, data);
}
