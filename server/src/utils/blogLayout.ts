import { z } from 'zod';

export const BLOG_SECTION_TYPES = ['featured', 'mostViewed', 'allArticles'] as const;
export type BlogSectionType = (typeof BLOG_SECTION_TYPES)[number];

export type BlogSection = {
  type: BlogSectionType;
  visible: boolean;
  title: string;
  subtitle: string;
};

export type BlogLayout = {
  version: 1;
  sections: BlogSection[];
};

const DEFAULT_SECTION_TEXT: Record<BlogSectionType, { title: string; subtitle: string }> = {
  featured: {
    title: 'Em destaque',
    subtitle: 'Selecionados para aparecer primeiro no blog.'
  },
  mostViewed: {
    title: 'Mais vistos',
    subtitle: 'O que as leitoras estão consumindo agora.'
  },
  allArticles: {
    title: 'Todos os artigos',
    subtitle: 'Artigos mais recentes, incluindo destaques e mais vistos.'
  }
};

const blogSectionSchema = z.object({
  type: z.enum(BLOG_SECTION_TYPES),
  visible: z.boolean().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional()
});

// `sections` is validated per-entry inside normalizeBlogLayout (not with
// z.array(blogSectionSchema) here), so one malformed entry only drops
// itself — not the whole array. zod's array parsing is all-or-nothing,
// which would otherwise wipe every valid, admin-customized section
// whenever a single stored entry fails validation.
const blogLayoutSchema = z.object({
  version: z.literal(1).optional(),
  sections: z.array(z.unknown()).optional()
});

/**
 * Normaliza o JSON de layout do blog: valida tipos permitidos, remove
 * duplicatas (mantendo a primeira ocorrência de cada tipo) e preenche
 * título/subtítulo ausentes com o texto default daquele tipo. Cada seção é
 * validada individualmente — uma entrada inválida é descartada sozinha,
 * sem derrubar as demais.
 */
export function normalizeBlogLayout(layout: unknown): BlogLayout {
  const parsed = blogLayoutSchema.safeParse(layout);
  const rawSections = parsed.success ? (parsed.data.sections ?? []) : [];

  const seen = new Set<BlogSectionType>();
  const sections: BlogSection[] = [];
  for (const rawItem of rawSections) {
    const itemParsed = blogSectionSchema.safeParse(rawItem);
    if (!itemParsed.success) continue;
    const raw = itemParsed.data;
    if (seen.has(raw.type)) continue;
    seen.add(raw.type);
    const defaults = DEFAULT_SECTION_TEXT[raw.type];
    sections.push({
      type: raw.type,
      visible: raw.visible ?? true,
      title: raw.title?.trim() || defaults.title,
      subtitle: raw.subtitle?.trim() || defaults.subtitle
    });
  }

  return { version: 1, sections };
}

/** Layout usado na primeira criação da página reservada do blog. */
export function defaultBlogLayout(): BlogLayout {
  return {
    version: 1,
    sections: BLOG_SECTION_TYPES.map((type) => ({
      type,
      visible: true,
      ...DEFAULT_SECTION_TEXT[type]
    }))
  };
}
