import { Icon, isRegisteredIcon } from '@/components/Icon';
import type { BlockRendererProps } from '../_shared/types';
import type { SpanBlockData } from './schema';

export function SpanRenderer({ data }: BlockRendererProps<SpanBlockData>) {
  if (data.kind === 'accent-bar') return <span className="hero-accent-bar" aria-hidden="true" />;
  if (data.kind === 'muted-text') return <span className="muted span-muted-text">{data.text || ''}</span>;
  if (data.kind === 'eyebrow') return <span className="span-eyebrow">{data.text || ''}</span>;
  if (data.kind === 'floating-badge') {
    return (
      <div className="hero-floating-badge">
        {data.icon && (
          <span className="hero-floating-badge-icon">
            {isRegisteredIcon(data.icon) ? <Icon name={data.icon} /> : data.icon}
          </span>
        )}
        <span>{data.text || ''}</span>
      </div>
    );
  }
  return null;
}
