import { useEffect } from 'react';

/** Atalhos de teclado do editor: Ctrl/Cmd+Z (undo), Ctrl/Cmd+Shift+Z ou Ctrl+Y (redo), Ctrl/Cmd+S (salvar). */
export function useEditorShortcuts(_props: {
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
}) {
  const { onUndo, onRedo, onSave } = _props;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      const target = e.target as HTMLElement | null;
      const isEditable =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (key === 's') {
        e.preventDefault();
        onSave();
        return;
      }
      if (key === 'z') {
        if (isEditable) return; // preserva o undo nativo do campo de texto
        e.preventDefault();
        if (e.shiftKey) onRedo();
        else onUndo();
        return;
      }
      if (key === 'y') {
        if (isEditable) return;
        e.preventDefault();
        onRedo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onUndo, onRedo, onSave]);
}
