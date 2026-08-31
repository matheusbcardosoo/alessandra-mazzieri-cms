import { useMemo, useState } from 'react';
import { SeoHead } from '../components/SeoHead';
import { ConfirmModal, IconButton, Modal, Switch } from '../components/AdminUI';
import { useAdminUsers, useCreateUser, useDeleteUser, useUpdateUser } from '../hooks/queries/useUsers';
import { useAdminPagesForSelect } from '../hooks/queries/usePages';
import { useCurrentUser } from '../hooks/queries/useCurrentUser';
import { getApiErrorMessage } from '../utils/apiError';
import type { ManagedUser, SectionAccess, SectionKey } from '../types';

const SECTION_LABELS: Record<SectionKey, string> = {
  blog: 'Blog e Artigos',
  menu: 'Barra de navegação',
  media: 'Mídia',
  forms: 'Respostas dos formulários',
  settings: 'Configurações do site'
};

const EMPTY_SECTIONS: SectionAccess = { blog: false, menu: false, media: false, forms: false, settings: false };

type FormState = {
  email: string;
  password: string;
  name: string;
  role: 'owner' | 'editor' | '';
  sectionAccess: SectionAccess;
  pageAccess: string[];
};

const EMPTY_FORM: FormState = { email: '', password: '', name: '', role: '', sectionAccess: EMPTY_SECTIONS, pageAccess: [] };

export function AdminUsersPage() {
  const { data: currentUser } = useCurrentUser();
  const { data: users, isLoading } = useAdminUsers();
  const { data: pages } = useAdminPagesForSelect();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const hasOwner = useMemo(() => (users ?? []).some((u) => u.role === 'owner'), [users]);
  const isAdmin = currentUser?.role === 'admin';

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, role: isAdmin ? '' : 'editor' });
    setError(null);
    setShowForm(true);
  };

  const openEdit = (user: ManagedUser) => {
    setEditing(user);
    setForm({
      email: user.email,
      password: '',
      name: user.name,
      role: user.role as 'owner' | 'editor',
      sectionAccess: user.sectionAccess,
      pageAccess: user.pageAccess
    });
    setError(null);
    setShowForm(true);
  };

  const togglePage = (id: string) => {
    setForm((prev) => ({
      ...prev,
      pageAccess: prev.pageAccess.includes(id) ? prev.pageAccess.filter((p) => p !== id) : [...prev.pageAccess, id]
    }));
  };

  const handleSubmit = () => {
    if (!editing && !form.role) {
      setError('Escolha um papel.');
      return;
    }
    setError(null);

    if (editing) {
      updateMutation.mutate(
        {
          id: editing.id,
          payload: {
            name: form.name,
            ...(form.password ? { password: form.password } : {}),
            sectionAccess: form.sectionAccess,
            pageAccess: form.pageAccess
          }
        },
        {
          onSuccess: () => setShowForm(false),
          onError: (err: unknown) => setError(getApiErrorMessage(err, 'Não foi possível salvar. Tente novamente.'))
        }
      );
      return;
    }

    createMutation.mutate(
      {
        email: form.email,
        password: form.password,
        name: form.name,
        role: form.role as 'owner' | 'editor',
        sectionAccess: form.sectionAccess,
        pageAccess: form.pageAccess
      },
      {
        onSuccess: () => setShowForm(false),
        onError: (err: unknown) => setError(getApiErrorMessage(err, 'Não foi possível salvar. Tente novamente.'))
      }
    );
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="admin-page">
      <SeoHead title="Usuários" />
      <div className="admin-page-header">
        <h1 style={{ margin: 0 }}>Usuários</h1>
        <p style={{ margin: 0, color: 'var(--color-forest)' }}>Gerencie quem tem acesso ao admin e o que cada pessoa pode editar.</p>
      </div>
      <div className="admin-actions" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" type="button" onClick={openCreate}>
          Novo usuário
        </button>
      </div>

      <div className="admin-table">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Papel</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                  Carregando...
                </td>
              </tr>
            )}
            {!isLoading && (users ?? []).length === 0 && (
              <tr>
                <td colSpan={4}>
                  <div className="admin-empty">Nenhum usuário cadastrado ainda.</div>
                </td>
              </tr>
            )}
            {(users ?? []).map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role === 'owner' ? 'Owner' : 'Editor'}</td>
                <td>
                  <div className="admin-actions" style={{ justifyContent: 'flex-end', gap: '0.35rem' }}>
                    <IconButton icon="edit" label="Editar" tone="info" onClick={() => openEdit(user)} />
                    <IconButton icon="trash" label="Remover" tone="danger" onClick={() => setDeleteTarget(user)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={showForm}
        title={editing ? 'Editar usuário' : 'Novo usuário'}
        onClose={() => setShowForm(false)}
        width={640}
        footer={
          <>
            <button className="btn btn-outline" type="button" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
            <button className="btn btn-primary" type="button" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </>
        }
      >
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <div className="admin-grid columns-2">
          <div className="form-field">
            <label htmlFor="user-name">Nome</label>
            <input id="user-name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="form-field">
            <label htmlFor="user-email">E-mail</label>
            <input
              id="user-email"
              type="email"
              value={form.email}
              disabled={!!editing}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            />
          </div>
          <div className="form-field">
            <label htmlFor="user-password">{editing ? 'Nova senha (opcional)' : 'Senha'}</label>
            <input
              id="user-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            />
          </div>
          {isAdmin && !editing && (
            <div className="form-field">
              <label htmlFor="user-role">Papel</label>
              <select
                id="user-role"
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as FormState['role'] }))}
              >
                <option value="">Selecione...</option>
                <option value="owner" disabled={hasOwner}>
                  Owner {hasOwner ? '(já existe um)' : ''}
                </option>
                <option value="editor">Editor</option>
              </select>
            </div>
          )}
        </div>

        <h3>Seções</h3>
        <div className="admin-grid columns-2">
          {(Object.keys(SECTION_LABELS) as SectionKey[]).map((key) => (
            <Switch
              key={key}
              id={`section-${key}`}
              label={SECTION_LABELS[key]}
              checked={form.sectionAccess[key]}
              onChange={(value) => setForm((p) => ({ ...p, sectionAccess: { ...p.sectionAccess, [key]: value } }))}
            />
          ))}
        </div>

        <h3>Páginas</h3>
        <div className="admin-grid columns-2">
          {(pages ?? []).map((page) => (
            <label key={page.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={form.pageAccess.includes(page.id)} onChange={() => togglePage(page.id)} />
              {page.title}
            </label>
          ))}
          {(pages ?? []).length === 0 && <p className="muted">Nenhuma página disponível para conceder.</p>}
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remover usuário"
        description={`Deseja remover "${deleteTarget?.name}"?`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })}
        confirmLabel="Remover"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
