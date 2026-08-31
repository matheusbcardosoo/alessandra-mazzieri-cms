import { useMemo, useState } from 'react';
import { SeoHead } from '../components/SeoHead';
import { ConfirmModal, NavDrawer, Switch } from '../components/AdminUI';
import {
  useAdminNavbar,
  useCreateNavbarItem,
  useDeleteNavbarItem,
  useReorderNavbarItems,
  useUpdateNavbarItem
} from '../hooks/queries/useNavbar';
import { useAdminPagesForSelect } from '../hooks/queries/usePages';
import { useAdminSiteSettings } from '../hooks/queries/useSiteSettings';
import type { NavbarItem } from '../types';
import { NavigationTree } from '../components/navigation/NavigationTree';
import { NavbarPreview } from '../components/navigation/NavbarPreview';

type NavigationForm = {
  label: string;
  type: 'INTERNAL_PAGE' | 'EXTERNAL_URL';
  pageKey: string;
  url: string;
  isParent: boolean;
  showInNavbar: boolean;
  showInFooter: boolean;
  parentId: string | null;
  isVisible: boolean;
};

const defaultForm: NavigationForm = {
  label: '',
  type: 'INTERNAL_PAGE',
  pageKey: '',
  url: '',
  isParent: false,
  showInNavbar: true,
  showInFooter: false,
  parentId: null,
  isVisible: true
};

const sortNavbar = (a: NavbarItem, b: NavbarItem) => (a.orderNavbar ?? 0) - (b.orderNavbar ?? 0);
const sortFooter = (a: NavbarItem, b: NavbarItem) => (a.orderFooter ?? 0) - (b.orderFooter ?? 0);

const builtInPages: { slug: string; label: string }[] = [
  { slug: 'home', label: 'Home (/)' },
  { slug: 'sobre', label: 'Sobre (/sobre)' },
  { slug: 'contato', label: 'Contato (/contato)' },
  { slug: 'blog', label: 'Blog (/blog)' }
];

export function NavigationBuilderPage() {
  const { data: items } = useAdminNavbar();
  const { data: pages } = useAdminPagesForSelect();
  const { data: settings } = useAdminSiteSettings();
  const [navItems, setNavItems] = useState<NavbarItem[]>(items ?? []);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<NavbarItem | null>(null);
  const [form, setForm] = useState<NavigationForm>(defaultForm);
  const [deleteTarget, setDeleteTarget] = useState<NavbarItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [prevItems, setPrevItems] = useState(items);
  if (items !== prevItems) {
    setPrevItems(items);
    if (items) setNavItems(items);
  }

  const navbarItems = useMemo(() => [...navItems].sort(sortNavbar), [navItems]);
  const footerItems = useMemo(
    () => navItems.filter((i) => i.showInFooter).sort(sortFooter),
    [navItems]
  );

  const showToastMessage = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 1800);
  };

  const createMutation = useCreateNavbarItem();
  const updateMutation = useUpdateNavbarItem();
  const deleteMutation = useDeleteNavbarItem();
  const reorderMutation = useReorderNavbarItems();

  const normalizeNavbarOrders = (list: NavbarItem[]) => {
    const next = list.map((i) => ({ ...i }));
    const parents = Array.from(new Set(next.filter((i) => i.showInNavbar).map((i) => i.parentId ?? null)));
    parents.forEach((parentId) => {
      const group = next
        .filter((i) => i.showInNavbar && (i.parentId ?? null) === parentId)
        .sort(sortNavbar);
      group.forEach((item, index) => {
        const ref = next.find((i) => i.id === item.id);
        if (ref) ref.orderNavbar = index;
      });
    });
    return next;
  };

  const handleReorder = async (updatedItems: NavbarItem[]) => {
    const previous = navItems;
    const normalized = normalizeNavbarOrders(updatedItems);
    setNavItems(normalized);  // Optimistic update — feedback imediato
    try {
      await reorderMutation.mutateAsync({ context: 'navbar', items: buildNavbarPayload(normalized) });
      // Sem toast necessário — já refletiu na UI
    } catch {
      setNavItems(previous);
      setError('Não foi possível salvar a nova ordem.');
    }
  };

  const handleToggleNavbar = async (item: NavbarItem) => {
    const previous = navItems;
    const maxOrder = Math.max(0, ...navItems.map((n) => n.orderNavbar ?? 0));
    const toggled = navItems.map((i) =>
      i.id === item.id
        ? {
            ...i,
            showInNavbar: !i.showInNavbar,
            parentId: !i.showInNavbar ? null : i.parentId,
            orderNavbar: i.showInNavbar ? i.orderNavbar : maxOrder + 1
          }
        : i
    );
    setNavItems(toggled);
    try {
      await updateMutation.mutateAsync({
        id: item.id,
        payload: { showInNavbar: !item.showInNavbar, parentId: !item.showInNavbar ? null : item.parentId }
      });
    } catch {
      setNavItems(previous);
    }
  };

  const handleToggleFooter = async (item: NavbarItem) => {
    const previous = navItems;
    const maxOrder = Math.max(0, ...navItems.map((n) => n.orderFooter ?? 0));
    const toggled = navItems.map((i) =>
      i.id === item.id
        ? { ...i, showInFooter: !i.showInFooter, orderFooter: !i.showInFooter ? maxOrder + 1 : i.orderFooter }
        : i
    );
    setNavItems(toggled);
    try {
      await updateMutation.mutateAsync({
        id: item.id,
        payload: { showInFooter: !item.showInFooter }
      });
    } catch {
      setNavItems(previous);
    }
  };

  const handleToggleVisible = async (item: NavbarItem) => {
    const previous = navItems;
    const toggled = navItems.map((i) => (i.id === item.id ? { ...i, isVisible: !item.isVisible } : i));
    setNavItems(toggled);
    try {
      await updateMutation.mutateAsync({ id: item.id, payload: { isVisible: !item.isVisible } });
    } catch {
      setNavItems(previous);
    }
  };

  const handleAddChild = (parent: NavbarItem) => {
    setEditing(null);
    setForm({
      label: '',
      type: 'INTERNAL_PAGE',
      pageKey: '',
      url: '',
      isParent: false,
      showInNavbar: true,
      showInFooter: false,
      parentId: parent.id,
      isVisible: true
    });
    setShowForm(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setShowForm(true);
  };

  const openEdit = (item: NavbarItem) => {
    setEditing(item);
    setForm({
      label: item.label,
      type: item.type,
      pageKey: item.pageKey ?? '',
      url: item.url ?? '',
      isParent: item.isParent,
      showInNavbar: item.showInNavbar,
      showInFooter: item.showInFooter,
      parentId: item.parentId ?? null,
      isVisible: item.isVisible
    });
    setShowForm(true);
  };

  const handleChangeParent = async (parentId: string | null) => {
    if (!editing) return;
    const previous = navItems;
    const working = normalizeNavbarOrders(navItems);
    const targetParent = parentId ? working.find((p) => p.id === parentId) : null;
    if (targetParent && !targetParent.isParent) {
      setError('Escolha um item pai válido.');
      return;
    }
    if (targetParent && targetParent.parentId) {
      setError('Profundidade máxima é de 2 níveis.');
      return;
    }
    const cleanParent = parentId === editing.id ? null : parentId;
    const nextOrder = working.filter((i) => i.showInNavbar && (i.parentId ?? null) === cleanParent).length;

    const updated = working.map((i) => {
      if (i.id === editing.id) return { ...i, parentId: cleanParent, isParent: false, orderNavbar: nextOrder };
      return i;
    });
    const normalized = normalizeNavbarOrders(updated);
    setNavItems(normalized);
    setForm((prev) => ({ ...prev, parentId: cleanParent }));
    try {
      await reorderMutation.mutateAsync({ context: 'navbar', items: buildNavbarPayload(normalized) });
      showToastMessage(cleanParent ? 'Item movido para submenu' : 'Item movido para raiz');
    } catch {
      setNavItems(previous);
      setError('Não foi possível alterar o submenu.');
    }
  };

  const handleSubmitForm = () => {
    setError(null);
    if (!form.label.trim()) {
      setError('Informe um rótulo.');
      return;
    }
    if (form.type === 'INTERNAL_PAGE' && !form.pageKey) {
      setError('Selecione uma página interna.');
      return;
    }
    if (form.type === 'EXTERNAL_URL' && !form.url) {
      setError('Informe uma URL externa.');
      return;
    }
    if (form.isVisible && !form.showInNavbar && !form.showInFooter) {
      setError('Itens visíveis precisam aparecer na navbar ou rodapé.');
      return;
    }

    const payload: Partial<NavbarItem> = {
      label: form.label,
      type: form.type,
      pageKey: form.type === 'INTERNAL_PAGE' ? form.pageKey : undefined,
      url: form.type === 'EXTERNAL_URL' ? form.url : undefined,
      isParent: form.isParent,
      showInNavbar: form.showInNavbar,
      showInFooter: form.showInFooter,
      parentId: form.isParent ? null : form.showInNavbar ? form.parentId : null,
      isVisible: form.isVisible
    };

    const onSuccess = () => {
      setForm(defaultForm);
      setShowForm(false);
      setEditing(null);
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, payload }, { onSuccess });
    } else {
      createMutation.mutate(payload, { onSuccess });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
  };

  const formTitle = editing ? 'Editar item' : 'Adicionar item';

  const parentOptions = navbarItems
    .filter((i) => i.parentId === null && i.showInNavbar && i.isParent && i.id !== editing?.id)
    .map((r) => ({ id: r.id, label: r.label }));

  return (
    <div className="admin-page nav-builder-shell">
      <SeoHead title="Navegação" />
      <div className="nav-builder-header">
        <div>
          <p className="eyebrow">Construtor da navegação</p>
          <h1>Navegação</h1>
          <p className="muted">Arraste e solte para reordenar, defina destino e visibilidade.</p>
        </div>
        <div className="admin-actions">
          <button className="btn btn-primary" onClick={openCreate} type="button">
            Adicionar item
          </button>
        </div>
      </div>

      {error && <div className="admin-empty" role="alert">{error}</div>}
      {toast && <div className="admin-toast">{toast}</div>}

      <div className="nav-builder-grid">
        <div className="nav-card">
          <div className="nav-card-header">
            <div>
              <p className="eyebrow">Estrutura</p>
              <h3>Estrutura da navegação</h3>
            </div>
          </div>
          <NavigationTree
            items={navbarItems}
            onToggleNavbar={handleToggleNavbar}
            onToggleFooter={handleToggleFooter}
            onToggleVisible={handleToggleVisible}
            onEdit={openEdit}
            onDelete={(item) => setDeleteTarget(item)}
            onReorder={handleReorder}
            onAddChild={handleAddChild}
          />
        </div>

        <div className="nav-card">
          <div className="nav-card-header">
            <div>
              <p className="eyebrow">Pré-visualização</p>
              <h3>Preview</h3>
              <p className="muted small">Como sua navegação aparecerá no site.</p>
            </div>
          </div>
          <NavbarPreview items={navbarItems} footerItems={footerItems} siteName={settings?.siteName} />
        </div>
      </div>

      <NavDrawer isOpen={showForm} onClose={() => setShowForm(false)} title={formTitle} footer={
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" type="button" onClick={() => setShowForm(false)}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={handleSubmitForm}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {editing ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      }>
        {/* Fieldset 1 — Conteúdo */}
        <fieldset className="nav-form-fieldset">
          <legend>Conteúdo</legend>
          <input
            placeholder="Rótulo do item"
            value={form.label}
            onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
            style={{ width: '100%' }}
          />
        </fieldset>

        {/* Fieldset 2 — Destino */}
        <fieldset className="nav-form-fieldset">
          <legend>Destino</legend>
          <select
            value={form.type}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as NavigationForm['type'] }))}
            style={{ width: '100%', marginBottom: '0.75rem' }}
          >
            <option value="INTERNAL_PAGE">Página interna</option>
            <option value="EXTERNAL_URL">URL externa</option>
          </select>
          {form.type === 'INTERNAL_PAGE' ? (
            <select
              value={form.pageKey}
              onChange={(e) => setForm((prev) => ({ ...prev, pageKey: e.target.value }))}
              style={{ width: '100%' }}
            >
              <option value="">Selecione uma página</option>
              {builtInPages.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.label}
                </option>
              ))}
              {pages?.map((p) => (
                <option key={p.id} value={p.slug}>
                  {p.title} — {p.slug}
                </option>
              ))}
            </select>
          ) : (
            <input
              placeholder="https://exemplo.com"
              value={form.url}
              onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
              style={{ width: '100%' }}
            />
          )}
        </fieldset>

        {/* Fieldset 3 — Exibição */}
        <fieldset className="nav-form-fieldset">
          <legend>Exibição</legend>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Switch
              checked={form.showInNavbar}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  showInNavbar: value,
                  parentId: value ? prev.parentId : null
                }))
              }
              label="Mostrar na navbar"
            />
            <Switch
              checked={form.showInFooter}
              onChange={(value) => setForm((prev) => ({ ...prev, showInFooter: value }))}
              label="Mostrar no rodapé"
            />
            <Switch
              checked={form.isVisible}
              onChange={(value) => setForm((prev) => ({ ...prev, isVisible: value }))}
              label="Visível"
            />
          </div>
        </fieldset>

        {/* Fieldset 4 — Hierarquia */}
        <fieldset className="nav-form-fieldset">
          <legend>Hierarquia</legend>
          <div style={{ marginBottom: '1rem' }}>
            <Switch
              checked={form.isParent}
              onChange={(value) => {
                if (form.parentId) return;
                setForm((prev) => ({
                  ...prev,
                  isParent: value,
                  parentId: value ? null : prev.parentId,
                  showInNavbar: value ? true : prev.showInNavbar
                }));
              }}
              label="Permitir submenus"
              id="isParent"
            />
            <p className="muted small" style={{ marginTop: '0.25rem' }}>
              Este item pode conter submenus. Itens com submenus não podem ser filhos de outros itens.
            </p>
          </div>

          {!form.isParent && (
            <div>
              <label htmlFor="parentId" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                Submenu de
              </label>
              <select
                id="parentId"
                value={form.parentId ?? ''}
                disabled={!form.showInNavbar}
                onChange={(e) => handleChangeParent(e.target.value || null)}
                style={{ width: '100%' }}
                title={!form.showInNavbar ? 'Ative "Mostrar na navbar" primeiro' : ''}
              >
                <option value="">Nenhum (nível raiz)</option>
                {parentOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </fieldset>
      </NavDrawer>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remover item"
        description="Esta ação também remove subitens vinculados."
        onConfirm={handleDelete}
        confirmLabel="Remover"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

export const AdminNavbarPage = NavigationBuilderPage;

function buildNavbarPayload(items: NavbarItem[]) {
  const payload: { id: string; parentId: string | null; order: number }[] = [];
  const parents = Array.from(new Set(items.filter((i) => i.showInNavbar).map((i) => i.parentId ?? null)));
  parents.forEach((parentId) => {
    const group = items
      .filter((i) => i.showInNavbar && (i.parentId ?? null) === parentId)
      .sort(sortNavbar);
    group.forEach((item, order) => payload.push({ id: item.id, parentId, order }));
  });
  return payload;
}
