import { Prisma, SiteSettings } from '@prisma/client';
import { cacheKeys, cacheTTL, cacheProvider } from '../config/cache';
import { SiteSettingsRepository } from '../repositories/siteSettings.repository';
import { toNullableJsonInput } from '../utils/prismaJson';
import { normalizeSiteTheme } from '../utils/siteTheme';
import { AuditActor, auditLogService } from './auditLog.service';

export type SocialLink = {
  id: string;
  platform: string;
  label?: string | null;
  description?: string | null;
  url: string;
  order: number;
  isVisible: boolean;
};

export type OfficeHour = {
  label: string;
  hours: string;
};

export type SiteAddress = {
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip?: string;
};

export type SiteSettingsInput = {
  siteName: string;
  cnpj?: string | null;
  professionalRegistration?: string | null;
  contactEmail?: string | null;
  logoUrl?: string | null;
  phone?: string | null;
  address?: SiteAddress | null;
  officeHours?: OfficeHour[] | null;
  socials?: SocialLink[];
  whatsappEnabled?: boolean | null;
  whatsappLink?: string | null;
  whatsappMessage?: string | null;
  whatsappPosition?: 'right' | 'left' | null;
  hideScheduleCta?: boolean | null;
  brandTagline?: string | null;
  theme?: unknown;
  metaDescription?: string | null;
  ogImageUrl?: string | null;
  gaId?: string | null;
  gscVerification?: string | null;
};

export class SiteSettingsService {
  private repository = new SiteSettingsRepository();

  private async ensureSettings(): Promise<SiteSettings> {
    const existing = await this.repository.findSingleton();
    if (existing) return existing;
    return this.repository.createDefault();
  }

  // Payload usado nas rotas admin: mantém o link do WhatsApp bruto (como foi
  // salvo) e todos os itens sociais, mesmo os ocultos, para edição no painel.
  private toAdminPayload(settings: SiteSettings): SiteSettingsInput {
    return {
      siteName: settings.siteName,
      cnpj: settings.cnpj,
      professionalRegistration: settings.professionalRegistration,
      contactEmail: settings.contactEmail,
      logoUrl: settings.logoUrl,
      phone: settings.phone ?? null,
      address: (settings.address as SiteAddress | null) ?? null,
      officeHours: (settings.officeHours as OfficeHour[] | null) ?? null,
      socials: Array.isArray(settings.socials) ? (settings.socials as SocialLink[]) : [],
      whatsappEnabled: settings.whatsappEnabled ?? false,
      whatsappLink: settings.whatsappLink ?? null,
      whatsappMessage: settings.whatsappMessage ?? null,
      whatsappPosition: (settings.whatsappPosition as 'right' | 'left' | null) ?? 'right',
      hideScheduleCta: settings.hideScheduleCta ?? false,
      brandTagline: settings.brandTagline ?? null,
      theme: normalizeSiteTheme(settings.theme),
      metaDescription: settings.metaDescription ?? null,
      ogImageUrl: settings.ogImageUrl ?? null,
      gaId: settings.gaId ?? null,
      gscVerification: settings.gscVerification ?? null
    };
  }

  // Payload usado nas rotas públicas (e cacheado): filtra sociais ocultos e
  // normaliza o link do WhatsApp para a URL final (wa.me/...).
  private toPublicPayload(settings: SiteSettings): SiteSettingsInput {
    const socials = Array.isArray(settings.socials) ? (settings.socials as SocialLink[]) : [];
    const visibleSocials = socials
      .filter((item) => item?.isVisible !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const normalizedWhatsapp = normalizeWhatsapp(settings.whatsappLink, settings.whatsappMessage);
    return {
      siteName: settings.siteName,
      cnpj: settings.cnpj,
      professionalRegistration: settings.professionalRegistration,
      contactEmail: settings.contactEmail,
      logoUrl: settings.logoUrl,
      phone: settings.phone ?? null,
      address: (settings.address as SiteAddress | null) ?? null,
      officeHours: (settings.officeHours as OfficeHour[] | null) ?? null,
      socials: visibleSocials,
      whatsappEnabled: settings.whatsappEnabled ?? false,
      whatsappLink: normalizedWhatsapp ?? null,
      whatsappMessage: settings.whatsappMessage ?? null,
      whatsappPosition: (settings.whatsappPosition as 'right' | 'left' | null) ?? 'right',
      hideScheduleCta: settings.hideScheduleCta ?? false,
      brandTagline: settings.brandTagline ?? null,
      theme: normalizeSiteTheme(settings.theme),
      metaDescription: settings.metaDescription ?? null,
      ogImageUrl: settings.ogImageUrl ?? null,
      gaId: settings.gaId ?? null,
      gscVerification: settings.gscVerification ?? null
    };
  }

  async getPublic(): Promise<SiteSettingsInput> {
    return cacheProvider.wrap(cacheKeys.siteSettings, cacheTTL.siteSettings, async () => {
      const settings = await this.ensureSettings();
      return this.toPublicPayload(settings);
    });
  }

  async getAdmin(): Promise<SiteSettingsInput> {
    const settings = await this.ensureSettings();
    return this.toAdminPayload(settings);
  }

  async update(payload: SiteSettingsInput, actor: AuditActor): Promise<SiteSettingsInput> {
    const sanitizedCnpj = payload.cnpj ? payload.cnpj.replace(/\D/g, '') : null;
    const socials = Array.isArray(payload.socials) ? payload.socials : [];
    const ordered = socials
      .map((item, index) => ({
        ...item,
        order: item.order ?? index
      }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const normalizedTagline = (payload.brandTagline ?? '').toString().trim();
    const theme = normalizeSiteTheme(payload.theme);
    // Salva o link bruto (somente telefone ou URL base, sem ?text=).
    // A normalização completa ocorre apenas na leitura pública (toPublicPayload).
    const rawWhatsappLink = extractRawWhatsappLink(payload.whatsappLink);
    const updated = await this.repository.upsert({
      siteName: payload.siteName,
      cnpj: sanitizedCnpj || null,
      professionalRegistration: payload.professionalRegistration ?? null,
      contactEmail: payload.contactEmail ?? null,
      logoUrl: payload.logoUrl ?? null,
      phone: payload.phone ?? null,
      address: toNullableJsonInput(payload.address),
      officeHours: toNullableJsonInput(payload.officeHours),
      socials: ordered,
      whatsappEnabled: payload.whatsappEnabled ?? false,
      whatsappLink: rawWhatsappLink ?? null,
      whatsappMessage: payload.whatsappMessage ?? null,
      whatsappPosition: payload.whatsappPosition ?? 'right',
      hideScheduleCta: payload.hideScheduleCta ?? false,
      brandTagline: normalizedTagline.length > 0 ? normalizedTagline.slice(0, 80) : null,
      theme: theme as Prisma.InputJsonValue,
      metaDescription: payload.metaDescription ?? null,
      ogImageUrl: payload.ogImageUrl ?? null,
      gaId: payload.gaId ?? null,
      gscVerification: payload.gscVerification ?? null
    });

    // Regenera o cache público imediatamente, na mesma request, em vez de só
    // invalidar e deixar a próxima leitura pagar o custo da query (Fase 3 do
    // plano de template: docs/plano-template.md).
    await cacheProvider.set(cacheKeys.siteSettings, this.toPublicPayload(updated), cacheTTL.siteSettings);
    await auditLogService.record({
      actor,
      action: 'update',
      entity: 'siteSettings',
      entityId: updated.id,
      entityLabel: updated.siteName
    });

    return this.toAdminPayload(updated);
  }
}

// Extracts the raw value before saving to DB.
// If the link is already a normalized wa.me URL, return only the phone digits
// to prevent digit accumulation from encoded ?text= on each save.
function extractRawWhatsappLink(link?: string | null): string | null {
  const raw = (link || '').trim();
  if (!raw) return null;
  const waMeMatch = raw.match(/^https?:\/\/wa\.me\/(\d+)/i);
  if (waMeMatch) return waMeMatch[1];
  return raw;
}

function normalizeWhatsapp(link?: string | null, message?: string | null): string | null {
  const raw = (link || '').trim();
  const msg = (message || '').trim();
  if (raw || msg) {
    // if link is only digits, treat as phone
    const digits = raw.replace(/\D/g, '');
    if (digits && msg) return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
    if (digits) return `https://wa.me/${digits}`;
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw}`;
  }
  return null;
}
