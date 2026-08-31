import { RichText } from '@/components/RichText';
import type { BlockRendererProps } from '../_shared/types';
import type { TextBlockData } from './schema';

export function TextRenderer({ data }: BlockRendererProps<TextBlockData>) {
  const widthClass = data.width === 'wide' ? 'page-text--wide' : '';
  const backgroundClass = data.background === 'soft' ? 'page-text--soft' : '';
  return (
    <div className={`page-public-text ${widthClass} ${backgroundClass}`.trim()}>
      <RichText html={data.contentHtml || ''} />
    </div>
  );
}
