import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { SeoHead } from '../components/SeoHead';
import { HELP_CATEGORIES, HELP_TUTORIALS, type HelpTutorial } from '../data/helpManifest';
import '../admin.css';

const RECOMMENDED = HELP_TUTORIALS.filter((t) => t.recommended);

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function AdminHelpPage() {
  const [search, setSearch] = useState('');
  const query = normalize(search.trim());

  const byCategory = useMemo(() => {
    const map = new Map<string, HelpTutorial[]>();
    HELP_CATEGORIES.forEach((cat) => map.set(cat.id, []));
    HELP_TUTORIALS.forEach((tutorial) => {
      const haystack = normalize(`${tutorial.title} ${tutorial.description}`);
      if (query && !haystack.includes(query)) return;
      map.get(tutorial.categoryId)?.push(tutorial);
    });
    return map;
  }, [query]);

  const totalVisible = useMemo(
    () => Array.from(byCategory.values()).reduce((sum, list) => sum + list.length, 0),
    [byCategory]
  );

  return (
    <div className="admin-page">
      <SeoHead title="Ajuda" />
      <div className="admin-page-header">
        <h1 style={{ margin: 0 }}>Ajuda</h1>
        <p style={{ margin: 0, color: 'var(--color-forest)' }}>
          Guia passo a passo do painel administrativo, com prints da sua própria instância.
        </p>
      </div>

      <div className="help-search-bar">
        <span className="help-search-icon" aria-hidden="true">
          ⌕
        </span>
        <input
          type="text"
          placeholder="Buscar um tutorial — ex: “logo”, “whatsapp”, “publicar artigo”…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {query && (
        <span className="help-result-count">
          {totalVisible} de {HELP_TUTORIALS.length} tutoriais
        </span>
      )}

      {!query && (
        <section className="help-recommended">
          <h2>Comece por aqui</h2>
          <div className="help-rec-list">
            {RECOMMENDED.map((tutorial) => (
              <Link key={tutorial.id} to={`/admin/ajuda/${tutorial.id}`} className="help-rec-pill">
                <span className="help-star">★</span>
                {tutorial.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      {HELP_CATEGORIES.map((cat) => {
        const items = byCategory.get(cat.id) ?? [];
        if (items.length === 0) return null;
        return (
          <section key={cat.id} className="help-section">
            <h2 className="help-section-title">{cat.title}</h2>
            <div className="admin-card">
              <div className="help-topic-list">
                {items.map((tutorial) => (
                  <Link key={tutorial.id} to={`/admin/ajuda/${tutorial.id}`} className="help-topic-row">
                    <span className="help-topic-main">
                      <span className="help-topic-title">{tutorial.title}</span>
                      <span className="help-topic-desc">{tutorial.description}</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {tutorial.recommended && <span className="help-star">★</span>}
                      <FontAwesomeIcon icon={faChevronRight} className="help-chevron" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {totalVisible === 0 && <div className="help-empty-state">Nenhum tutorial encontrado para essa busca.</div>}
    </div>
  );
}
