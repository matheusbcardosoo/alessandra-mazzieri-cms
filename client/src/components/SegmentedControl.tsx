import type { ComponentProps } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

type IconType = ComponentProps<typeof FontAwesomeIcon>['icon'];

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  icon?: IconType;
  disabled?: boolean;
};

type SegmentedControlProps<T extends string> = {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  /** Ocupa 100% da largura, dividindo o espaço entre as opções. */
  block?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  block = false,
  disabled = false,
  ariaLabel
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`segmented-control${block ? ' is-block' : ''}`}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        const isDisabled = disabled || opt.disabled;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={`segmented-option${isActive ? ' is-active' : ''}`}
            disabled={isDisabled}
            onClick={() => !isDisabled && onChange(opt.value)}
          >
            {opt.icon && <FontAwesomeIcon icon={opt.icon} />}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
