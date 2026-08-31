import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { SeoHead } from '../components/SeoHead';
import { HELP_CATEGORIES, HELP_TUTORIALS } from '../data/helpManifest';
import '../admin.css';

function StepShot({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="help-step-shot">
        <div className="help-step-shot-missing">
          Captura ainda não gerada — rode <code>npm run generate:help-screenshots</code>.
        </div>
      </div>
    );
  }

  return (
    <div className="help-step-shot">
      <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
    </div>
  );
}

export function AdminHelpTutorialPage() {
  const { id } = useParams<{ id: string }>();
  const tutorial = HELP_TUTORIALS.find((t) => t.id === id);

  if (!tutorial) {
    return <Navigate to="/admin/ajuda" replace />;
  }

  const category = HELP_CATEGORIES.find((c) => c.id === tutorial.categoryId);
  const related = HELP_TUTORIALS.filter((t) => t.categoryId === tutorial.categoryId && t.id !== tutorial.id).slice(
    0,
    5
  );

  return (
    <div className="admin-page">
      <SeoHead title={tutorial.title} />
      <div className="help-detail">
        <p className="help-breadcrumb">
          <Link to="/admin/ajuda">Ajuda</Link> / {category?.title}
        </p>

        <div className="help-detail-header">
          <h1>
            {tutorial.title}
            {tutorial.recommended && <span className="help-recommended-badge">★ Recomendado</span>}
          </h1>
          <p>{tutorial.description}</p>
        </div>

        <ol className="help-step-list">
          {tutorial.steps.map((step, index) => (
            <li key={index} className="help-step">
              <span className="help-step-num">{index + 1}</span>
              <div className="help-step-body">
                <p className="help-step-text">{step.text}</p>
                {step.capture && (
                  <StepShot src={`/help/${tutorial.id}--s${index + 1}.png`} alt={`Passo ${index + 1}: ${step.text}`} />
                )}
              </div>
            </li>
          ))}
        </ol>

        {related.length > 0 && (
          <div className="help-related">
            <h2>Outros tutoriais em {category?.title}</h2>
            <div className="admin-card">
              <div className="help-topic-list">
                {related.map((t) => (
                  <Link key={t.id} to={`/admin/ajuda/${t.id}`} className="help-topic-row">
                    <span className="help-topic-main">
                      <span className="help-topic-title">{t.title}</span>
                    </span>
                    <FontAwesomeIcon icon={faChevronRight} className="help-chevron" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
