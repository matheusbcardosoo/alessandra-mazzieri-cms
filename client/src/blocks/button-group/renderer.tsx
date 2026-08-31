import type { BlockRendererProps } from '../_shared/types';
import type { ButtonGroupBlockData } from './schema';

export function ButtonGroupRenderer({ data }: BlockRendererProps<ButtonGroupBlockData>) {
  const buttons = data.buttons ?? [];
  const align = data.align ?? 'start';
  const stackOnMobile = data.stackOnMobile ?? true;
  const alignClass = align === 'center' ? 'hero-actions--center' : 'hero-actions--start';
  const stackClass = stackOnMobile ? 'hero-actions--stack' : '';

  return (
    <div className={`hero-actions ${alignClass} ${stackClass}`.trim()}>
      {buttons.map((btn, idx) => {
        const variant = btn.variant ?? 'primary';
        const classes = variant === 'secondary' ? 'btn btn-outline' : 'btn btn-primary';
        return (
          <a
            key={idx}
            className={classes}
            href={btn.href || '#'}
            target={btn.linkMode === 'page' ? undefined : '_blank'}
            rel={btn.linkMode === 'page' ? undefined : 'noreferrer'}
          >
            {btn.label}
          </a>
        );
      })}
    </div>
  );
}
