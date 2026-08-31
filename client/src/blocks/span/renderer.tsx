import type { BlockRendererProps } from '../_shared/types';
import type { SpanBlockData } from './schema';

export function SpanRenderer({ data }: BlockRendererProps<SpanBlockData>) {
  if (data.kind === 'accent-bar') return <span className="hero-accent-bar" aria-hidden="true" />;
  if (data.kind === 'muted-text') return <span className="muted span-muted-text">{data.text || ''}</span>;
  return null;
}
