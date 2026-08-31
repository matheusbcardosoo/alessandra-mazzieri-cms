import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { NavbarItem } from '../../types';
import { NavigationItemRow } from './NavigationItemRow';

type NavigationTreeProps = {
  items: NavbarItem[];
  onToggleNavbar: (item: NavbarItem) => void;
  onToggleFooter: (item: NavbarItem) => void;
  onToggleVisible: (item: NavbarItem) => void;
  onEdit: (item: NavbarItem) => void;
  onDelete: (item: NavbarItem) => void;
  onReorder: (ordered: NavbarItem[]) => void;
  onAddChild: (parent: NavbarItem) => void;
};

function SortableItem({
  id,
  children,
}: {
  id: string;
  children: (props: {
    listeners: ReturnType<typeof useSortable>['listeners'];
    attributes: ReturnType<typeof useSortable>['attributes'];
    isDragging: boolean;
  }) => React.ReactNode;
}) {
  const sortable = useSortable({ id });
  /* eslint-disable react-hooks/refs -- dnd-kit's useSortable() must be read in the same
     render that calls it: ref={setNodeRef}, style built from transform/transition, and the
     listeners/attributes/isDragging passed down are all read directly off its return value.
     That's the library's documented API (see dnd-kit's own useSortable examples) — there's
     no restructure that avoids reading these in-render while using it as intended. */
  return (
    <div
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      }}
    >
      {children({ listeners: sortable.listeners, attributes: sortable.attributes, isDragging: sortable.isDragging })}
    </div>
  );
  /* eslint-enable react-hooks/refs */
}

const sortByOrder = (a: NavbarItem, b: NavbarItem) =>
  (a.orderNavbar ?? 0) - (b.orderNavbar ?? 0);

export function NavigationTree({
  items,
  onToggleNavbar,
  onToggleFooter,
  onToggleVisible,
  onEdit,
  onDelete,
  onReorder,
  onAddChild,
}: NavigationTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const roots = [...items]
    .filter((i) => i.showInNavbar && i.parentId === null)
    .sort(sortByOrder);
  const childrenMap = items.reduce<Record<string, NavbarItem[]>>((acc, item) => {
    if (item.parentId) {
      acc[item.parentId] ??= [];
      acc[item.parentId].push(item);
    }
    return acc;
  }, {});
  Object.values(childrenMap).forEach((g) => g.sort(sortByOrder));

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRootDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = roots.findIndex((i) => i.id === active.id);
    const newIndex = roots.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...roots];
    reordered.splice(newIndex, 0, reordered.splice(oldIndex, 1)[0]);
    const updated = items.map((item) => {
      const newOrder = reordered.findIndex((r) => r.id === item.id);
      return newOrder !== -1 ? { ...item, orderNavbar: newOrder } : item;
    });
    onReorder(updated);
  };

  const handleChildDragEnd = (parentId: string, event: DragEndEvent): void => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const children = childrenMap[parentId] ?? [];
    const oldIndex = children.findIndex((i) => i.id === active.id);
    const newIndex = children.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...children];
    reordered.splice(newIndex, 0, reordered.splice(oldIndex, 1)[0]);
    const updated = items.map((item) => {
      const newOrder = reordered.findIndex((c) => c.id === item.id);
      return newOrder !== -1 ? { ...item, orderNavbar: newOrder } : item;
    });
    onReorder(updated);
  };

  if (roots.length === 0) {
    return <div className="admin-empty">Nenhum item na navegação.</div>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleRootDragEnd}
    >
      <SortableContext
        items={roots.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="nav-tree">
          {roots.map((item) => {
            const children = childrenMap[item.id] ?? [];
            const isExpanded = expandedIds.has(item.id);

            return (
              <SortableItem key={item.id} id={item.id}>
                {(sortable) => (
                  <div className="nav-tree-node">
                    <div className="nav-root-row">
                      {item.isParent && (
                        <button
                          type="button"
                          className={`nav-expand-btn ${
                            isExpanded ? 'is-expanded' : ''
                          }`}
                          onClick={() => toggleExpand(item.id)}
                          aria-label={
                            isExpanded
                              ? 'Recolher submenus'
                              : 'Expandir submenus'
                          }
                          aria-expanded={isExpanded}
                        >
                          <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: '0.875rem' }} />
                        </button>
                      )}
                      {!item.isParent && <span className="nav-expand-spacer" />}
                      <NavigationItemRow
                        item={item}
                        depth={0}
                        onToggleNavbar={() => onToggleNavbar(item)}
                        onToggleFooter={() => onToggleFooter(item)}
                        onToggleVisible={() => onToggleVisible(item)}
                        onEdit={() => onEdit(item)}
                        onDelete={() => onDelete(item)}
                        dragListeners={sortable.listeners}
                        dragAttributes={sortable.attributes}
                        isDragging={sortable.isDragging}
                      />
                    </div>

                    {item.isParent && isExpanded && (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(e) => handleChildDragEnd(item.id, e)}
                      >
                        <SortableContext
                          items={children.map((c) => c.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="nav-children-shell">
                            {children.length === 0 && (
                              <div className="admin-empty small">
                                Nenhum submenu.{' '}
                                <button
                                  type="button"
                                  className="btn-link"
                                  onClick={() => onAddChild(item)}
                                >
                                  Adicionar
                                </button>
                              </div>
                            )}
                            {children.map((child) => (
                              <SortableItem key={child.id} id={child.id}>
                                {(childSortable) => (
                                  <NavigationItemRow
                                    item={child}
                                    depth={1}
                                    onToggleNavbar={() => onToggleNavbar(child)}
                                    onToggleFooter={() => onToggleFooter(child)}
                                    onToggleVisible={() => onToggleVisible(child)}
                                    onEdit={() => onEdit(child)}
                                    onDelete={() => onDelete(child)}
                                    dragListeners={childSortable.listeners}
                                    dragAttributes={childSortable.attributes}
                                    isDragging={childSortable.isDragging}
                                  />
                                )}
                              </SortableItem>
                            ))}
                            <button
                              type="button"
                              className="btn btn-ghost small nav-add-child-btn"
                              onClick={() => onAddChild(item)}
                            >
                              + Adicionar submenu
                            </button>
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                )}
              </SortableItem>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
