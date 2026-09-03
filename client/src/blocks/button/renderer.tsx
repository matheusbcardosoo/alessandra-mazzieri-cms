import { Icon, isRegisteredIcon } from '@/components/Icon';
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
        <span>{data.label}</span>
        {data.icon && (
          <span className="page-button-icon">
            {isRegisteredIcon(data.icon) ? <Icon name={data.icon} /> : data.icon}
          </span>
        )}
      </a>
    </div>
  );
}
