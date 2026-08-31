import type { BlockRendererProps } from '../_shared/types';
import type { ButtonBlockData } from './schema';

export function ButtonRenderer({ data }: BlockRendererProps<ButtonBlockData>) {
  const variant = data.variant ?? 'primary';
  const classes = variant === 'secondary' ? 'btn btn-outline' : variant === 'ghost' ? 'btn btn-ghost' : 'btn btn-primary';
  return (
    <div className="page-public-button-wrapper">
      <a
        className={`page-public-button ${classes}`.trim()}
        href={data.href || '#'}
        target={data.newTab ? '_blank' : undefined}
        rel={data.newTab ? 'noreferrer' : undefined}
      >
        {data.icon && <span className="page-button-icon">{data.icon}</span>}
        <span>{data.label}</span>
      </a>
    </div>
  );
}
