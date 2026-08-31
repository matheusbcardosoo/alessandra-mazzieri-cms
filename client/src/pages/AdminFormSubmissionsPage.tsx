import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays,
  faChevronLeft,
  faChevronRight,
  faCircleExclamation,
  faEnvelope,
  faEye,
  faFilter,
  faInbox,
  faLayerGroup,
  faMagnifyingGlass,
  faRotateRight,
  faTrash
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { ConfirmModal } from '../components/AdminUI';
import { toast } from '../components/toastStore';
import {
  deleteFormSubmission,
  fetchFormSubmissions,
  type FormSubmission,
  type FormSubmissionsResponse
} from '../api/queries';

interface Page {
  id: string;
  title: string;
  slug: string;
}

export function AdminFormSubmissionsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filterPageId, setFilterPageId] = useState('');
  const [searchText, setSearchText] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const limit = 20;

  const { data: pages } = useQuery<Page[]>({
    queryKey: ['pages-list'],
    queryFn: async () => {
      const response = await fetch('/api/admin/pages', {
        credentials: 'include'
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.pages || [];
    }
  });

  const { data, isLoading, error, refetch } = useQuery<FormSubmissionsResponse>({
    queryKey: ['formSubmissions', currentPage, filterPageId, searchText, startDate, endDate],
    queryFn: () =>
      fetchFormSubmissions({
        pageId: filterPageId || undefined,
        search: searchText || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page: currentPage,
        limit
      })
  });

  const handleDelete = (id: string) => setConfirmDeleteId(id);

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      await deleteFormSubmission(confirmDeleteId);
      refetch();
    } catch (error) {
      toast.error('Falha ao excluir', {
        message: error instanceof Error ? error.message : 'Nao foi possivel excluir a resposta.',
        code: 'FORM-002'
      });
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  const handleClearFilters = () => {
    setFilterPageId('');
    setSearchText('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const hasActiveFilters = filterPageId || searchText || startDate || endDate;

  const normalizePhone = (phone?: string | null) => {
    const digits = (phone || '').replace(/\D/g, '');
    if (digits.length < 10) return null;
    return digits.startsWith('55') ? digits : `55${digits}`;
  };

  const normalizeLabel = (label?: string | null) =>
    (label || '')
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .trim();

  const getWhatsAppLink = (
    phone: string | null,
    message = 'Ola! Vi sua mensagem enviada pelo formulario do site. Posso te ajudar?'
  ) => {
    const normalized = normalizePhone(phone || undefined);
    if (!normalized) return null;
    return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
  };

  const fallbackFromResolved = (
    submission: FormSubmission,
    labels: string[]
  ): { value: string | null } => {
    const found = submission.resolvedFields?.find((f) => {
      const norm = normalizeLabel(f.label);
      return labels.some((term) => norm.includes(term));
    });
    if (found?.value) return { value: String(found.value).trim() || null };
    return { value: null };
  };

  const deriveLeadInfo = (submission: FormSubmission) => {
    const name =
      submission.leadName?.trim() ||
      fallbackFromResolved(submission, ['nome', 'name']).value ||
      null;

    const message =
      submission.leadMessage?.trim() ||
      fallbackFromResolved(submission, ['mensagem', 'message', 'coment', 'observa', 'descricao', 'descri']).value ||
      null;

    return {
      leadName: name && name.length > 0 ? name : 'Sem nome',
      leadMessage: message
    };
  };

  const normalizeEmail = (value?: string | null): string | null => {
    const email = (value || '').trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
  };

  const findFieldByType = (submission: FormSubmission, type: string): string | null => {
    const found = submission.resolvedFields?.find((f) => f.type === type);
    if (found?.value != null && String(found.value).trim()) return String(found.value).trim();
    return null;
  };

  const derivePhone = (submission: FormSubmission) => {
    const byType = findFieldByType(submission, 'tel');
    const fallbackRaw = fallbackFromResolved(submission, ['telefone', 'whatsapp', 'celular', 'fone', 'phone']).value;
    const phoneNormalized =
      normalizePhone(byType || undefined) ||
      submission.leadPhoneNormalized ||
      normalizePhone(submission.leadPhone || undefined) ||
      normalizePhone(fallbackRaw || undefined);
    return phoneNormalized;
  };

  const deriveEmail = (submission: FormSubmission) => {
    const byType = findFieldByType(submission, 'email');
    const fallbackRaw = fallbackFromResolved(submission, ['email', 'e-mail']).value;
    return normalizeEmail(byType) || normalizeEmail(fallbackRaw);
  };

  return (
    <div className="admin-page form-submissions-page">
      <div className="admin-page-header form-submissions-header">
        <div>
          <h1>Respostas de Formulários</h1>
          <p className="muted">Acompanhe leads, mensagens e contatos enviados pelos visitantes.</p>
        </div>
        {data && (
          <div className="form-submissions-summary" aria-label="Resumo das respostas">
            <span className="form-submissions-summary-value">{data.total}</span>
            <span className="form-submissions-summary-label">respostas</span>
          </div>
        )}
      </div>

      <div className="admin-card form-submissions-card">
        <section className="form-submissions-filters" aria-label="Filtros de respostas">
          <div className="form-submissions-filters-heading">
            <FontAwesomeIcon icon={faFilter} />
            <span>Filtros</span>
          </div>

          <div className="form-submissions-filter-grid">
            <label className="form-field form-submissions-field">
              <span>
                <FontAwesomeIcon icon={faMagnifyingGlass} />
                Buscar
              </span>
              <input
                type="text"
                placeholder="Nome, email, telefone..."
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </label>

            <label className="form-field form-submissions-field">
              <span>
                <FontAwesomeIcon icon={faLayerGroup} />
                Página
              </span>
              <select
                value={filterPageId}
                onChange={(e) => {
                  setFilterPageId(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">Todas as páginas</option>
                {pages?.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field form-submissions-field">
              <span>
                <FontAwesomeIcon icon={faCalendarDays} />
                Data inicial
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </label>

            <label className="form-field form-submissions-field">
              <span>
                <FontAwesomeIcon icon={faCalendarDays} />
                Data final
              </span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </label>

            {hasActiveFilters && (
              <div className="form-submissions-clear">
                <button className="btn btn-outline" onClick={handleClearFilters}>
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        </section>

        {data && (
          <div className="form-submissions-status">
            {data.total > 0 ? (
              <>
                Mostrando <strong>{(currentPage - 1) * limit + 1}</strong> a{' '}
                <strong>{Math.min(currentPage * limit, data.total)}</strong> de{' '}
                <strong>{data.total}</strong> respostas
              </>
            ) : (
              'Nenhuma resposta encontrada'
            )}
          </div>
        )}

        {isLoading && (
          <div className="form-submissions-state">
            <span className="form-submissions-spinner" aria-hidden="true" />
            <p>Carregando respostas...</p>
          </div>
        )}

        {error && (
          <div className="form-submissions-state form-submissions-state-error" role="alert">
            <FontAwesomeIcon icon={faCircleExclamation} />
            <p>Erro ao carregar respostas</p>
            <button className="btn btn-outline" onClick={() => refetch()}>
              <FontAwesomeIcon icon={faRotateRight} />
              Tentar novamente
            </button>
          </div>
        )}

        {data && data.submissions.length > 0 && (
          <>
            <div className="form-submissions-table-wrap">
              <table className="admin-table form-submissions-table">
                <thead>
                  <tr>
                    <th>Data/Hora</th>
                    <th>Página</th>
                    <th>Resposta</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data.submissions.map((submission) => {
                    const phoneNormalized = derivePhone(submission);
                    const waLink = phoneNormalized ? getWhatsAppLink(phoneNormalized) : null;
                    const email = deriveEmail(submission);
                    const { leadName, leadMessage } = deriveLeadInfo(submission);

                    return (
                      <tr key={submission.id}>
                        <td>
                          <time className="submission-date" dateTime={submission.createdAt}>
                            <span>
                              {new Date(submission.createdAt).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </span>
                            <small>
                              {new Date(submission.createdAt).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </small>
                          </time>
                        </td>
                        <td>
                          {submission.page ? (
                            <div className="submission-page">
                              <strong>{submission.page.title}</strong>
                              <small>/p/{submission.page.slug}</small>
                            </div>
                          ) : (
                            <span className="muted">-</span>
                          )}
                        </td>
                        <td>
                          <div className="submission-lead">
                            <strong>{leadName}</strong>
                            <p title={leadMessage || undefined}>{leadMessage || 'Sem mensagem'}</p>
                          </div>
                        </td>
                        <td>
                          <div className="submission-actions">
                            <button
                              className="submission-action submission-action-whatsapp"
                              aria-label={waLink ? 'Chamar no WhatsApp' : 'Telefone não informado'}
                              title={waLink ? 'Chamar no WhatsApp' : 'Telefone não informado'}
                              onClick={() => waLink && window.open(waLink, '_blank', 'noopener,noreferrer')}
                              disabled={!waLink}
                            >
                              <FontAwesomeIcon icon={faWhatsapp} />
                            </button>
                            <button
                              className="submission-action submission-action-email"
                              aria-label={email ? 'Enviar e-mail' : 'E-mail não informado'}
                              title={email ? 'Enviar e-mail' : 'E-mail não informado'}
                              onClick={() => email && window.open(`mailto:${email}`, '_self')}
                              disabled={!email}
                            >
                              <FontAwesomeIcon icon={faEnvelope} />
                            </button>
                            <Link
                              to={`/admin/form-submissions/${submission.id}`}
                              className="submission-action"
                              aria-label="Visualizar resposta"
                              title="Visualizar resposta"
                            >
                              <FontAwesomeIcon icon={faEye} />
                            </Link>
                            <button
                              className="submission-action submission-action-danger"
                              onClick={() => handleDelete(submission.id)}
                              aria-label="Excluir resposta"
                              title="Excluir resposta"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {data.totalPages > 1 && (
              <div className="form-submissions-pagination">
                <button
                  className="btn btn-outline"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <FontAwesomeIcon icon={faChevronLeft} />
                  Anterior
                </button>
                <div className="form-submissions-pages">
                  {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                    let pageNum;
                    if (data.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= data.totalPages - 2) {
                      pageNum = data.totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        className={`form-submissions-page-button ${currentPage === pageNum ? 'is-active' : ''}`}
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  className="btn btn-outline"
                  onClick={() => setCurrentPage((p) => Math.min(data.totalPages, p + 1))}
                  disabled={currentPage === data.totalPages}
                >
                  Próxima
                  <FontAwesomeIcon icon={faChevronRight} />
                </button>
              </div>
            )}
          </>
        )}

        {data && data.submissions.length === 0 && !isLoading && (
          <div className="form-submissions-state">
            <FontAwesomeIcon icon={faInbox} />
            <h3>Nenhuma resposta encontrada</h3>
            <p>
              {hasActiveFilters
                ? 'Tente ajustar os filtros para encontrar respostas.'
                : 'As respostas de formulários aparecerão aqui.'}
            </p>
            {hasActiveFilters && (
              <button className="btn btn-outline" onClick={handleClearFilters}>
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        title="Excluir resposta"
        description="Esta ação não pode ser desfeita. Tem certeza que deseja excluir esta resposta?"
        confirmLabel="Excluir"
        onConfirm={handleConfirmDelete}
        onClose={() => setConfirmDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
}
