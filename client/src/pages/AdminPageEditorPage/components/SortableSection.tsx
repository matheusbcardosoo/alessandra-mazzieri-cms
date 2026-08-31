import type { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';

export type SectionDragHandle = {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
};

/**
 * Wrapper sortable (dnd-kit) de uma seção do editor.
 * Usa render-prop para entregar os bindings da handle de arrasto
 * (passados adiante até o grip do SectionToolbar). Seções "hero" passam
 * `disabled` e ficam fixas no topo.
 */
export function SortableSection(_props: {
  id: string;
  disabled?: boolean;
  children: (handle: SectionDragHandle & { isDragging: boolean }) => ReactNode;
}) {
  const { id, disabled, children } = _props;
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id,
    disabled
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    ...(isDragging ? { zIndex: 20, position: 'relative' } : {})
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'section-dragging' : undefined}>
      {children({ attributes, listeners, isDragging })}
    </div>
  );
}
