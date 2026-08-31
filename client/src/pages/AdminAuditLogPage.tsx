import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays,
  faChevronLeft,
  faChevronRight,
  faCircleExclamation,
  faClockRotateLeft,
  faFilter,
  faRotateRight
} from '@fortawesome/free-solid-svg-icons';
import { useAuditLog } from '../hooks/queries/useAuditLog';
import type { AuditAction, AuditEntity } from '../types';

const entityLabels: Record<AuditEntity, string> = {
  page: 'Página',
  post: 'Artigo',
  user: 'Usuário',
  media: 'Mídia',
  navItem: 'Item de menu',
  siteSettings: 'Configurações do site',
  formSubmission: 'Resposta de formulário'
};

const actionLabels: Record<AuditAction, string> = {
  create: 'Criou',
  update: 'Atualizou',
  publish: 'Publicou',
  unpublish: 'Despublicou',
  delete: 'Removeu',
  upload: 'Enviou',
  reorder: 'Reordenou'
};

export function AdminAuditLogPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const limit = 20;

  const { data, isLoading, error, refetch } = useAuditLog({
    entity: entity || undefined,
    action: action || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page: currentPage,
    limit
  });

  const handleClearFilters = () => {
    setEntity('');
    setAction('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const hasActiveFilters = entity || action || startDate || endDate;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Log de Auditoria</h1>
          <p className="muted">Histórico de ações administrativas: quem fez o quê e quando.</p>
        </div>
        {data && (
          <div className="form-submissions-summary" aria-label="Resumo do log">
            <span className="form-submissions-summary-value">{data.total}</span>
            <span className="form-submissions-summary-label">registros</span>
          </div>
        )}
      </div>

      <div className="admin-card form-submissions-card">
        <section className="form-submissions-filters" aria-label="Filtros do log de auditoria">
          <div className="form-submissions-filters-heading">
            <FontAwesomeIcon icon={faFilter} />
            <span>Filtros</span>
          </div>

          <div className="form-submissions-filter-grid">
            <label className="form-field form-submissions-field">
              <span>Entidade</span>
              <select
                value={entity}
                onChange={(e) => {
                  setEntity(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">Todas</option>
                {Object.entries(entityLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field form-submissions-field">
              <span>Ação</span>
              <select
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">Todas</option>
                {Object.entries(actionLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
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
                <strong>{Math.min(currentPage * limit, data.total)}</strong> de <strong>{data.total}</strong> registros
              </>
            ) : (
              'Nenhum registro encontrado'
            )}
          </div>
        )}

        {isLoading && (
          <div className="form-submissions-state">
            <span className="form-submissions-spinner" aria-hidden="true" />
            <p>Carregando log...</p>
          </div>
        )}

        {error && (
          <div className="form-submissions-state form-submissions-state-error" role="alert">
            <FontAwesomeIcon icon={faCircleExclamation} />
            <p>Erro ao carregar o log de auditoria</p>
            <button className="btn btn-outline" onClick={() => refetch()}>
              <FontAwesomeIcon icon={faRotateRight} />
              Tentar novamente
            </button>
          </div>
        )}

        {data && data.items.length > 0 && (
          <>
            <div className="form-submissions-table-wrap">
              <table className="admin-table form-submissions-table">
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>Quem</th>
                    <th>Ação</th>
                    <th>O quê</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <time className="submission-date" dateTime={entry.createdAt}>
                          <span>
                            {new Date(entry.createdAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </span>
                          <small>
                            {new Date(entry.createdAt).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </small>
                        </time>
                      </td>
                      <td>
                        <div className="submission-lead">
                          <strong>{entry.actorName}</strong>
                          <p>{entry.actorEmail}</p>
                        </div>
                      </td>
                      <td>{actionLabels[entry.action] ?? entry.action}</td>
                      <td>
                        <div className="submission-lead">
                          <strong>{entityLabels[entry.entity] ?? entry.entity}</strong>
                          <p title={entry.entityLabel}>{entry.entityLabel}</p>
                        </div>
                      </td>
                    </tr>
                  ))}
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

        {data && data.items.length === 0 && !isLoading && (
          <div className="form-submissions-state">
            <FontAwesomeIcon icon={faClockRotateLeft} />
            <h3>Nenhum registro encontrado</h3>
            <p>
              {hasActiveFilters
                ? 'Tente ajustar os filtros para encontrar registros.'
                : 'As ações administrativas aparecerão aqui.'}
            </p>
            {hasActiveFilters && (
              <button className="btn btn-outline" onClick={handleClearFilters}>
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
