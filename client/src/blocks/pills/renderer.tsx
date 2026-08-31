import type { PillItem } from '@/types';
import type { BlockRendererProps } from '../_shared/types';
import type { PillsBlockData } from './schema';

export function PillsRenderer({ data }: BlockRendererProps<PillsBlockData>) {
  const rawPills = data.pills ?? data.items ?? [];
  const sizeClass = data.size ? `pills--${data.size}` : '';
  const variantClass = data.variant ? `pills--${data.variant}` : '';

  return (
    <div className={`pills-row ${sizeClass} ${variantClass}`.trim()}>
      {rawPills.map((pill: string | PillItem, idx: number) => {
        const pillData = typeof pill === 'string'
          ? { text: pill, href: null, linkMode: null, articleSlug: null }
          : pill;
        const href = pillData.linkMode === 'article' && pillData.articleSlug
          ? `/blog/${pillData.articleSlug}`
          : pillData.href;
        if (href) {
          return <a key={idx} href={href} className="pill pill--link">{pillData.text}</a>;
        }
        return <span key={idx} className="pill">{pillData.text}</span>;
      })}
    </div>
  );
}
