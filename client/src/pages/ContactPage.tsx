import { useQuery } from '@tanstack/react-query';
import { fetchPage } from '../api/queries';
import { SeoHead } from '../components/SeoHead';
import { ContentLoader } from '../components/ContentLoader';
import { PageRenderer } from '../components/PageRenderer';

export function ContactPage() {
  const { data: page, isLoading, isError } = useQuery({ queryKey: ['page', 'contato'], queryFn: () => fetchPage('contato') });

  if (isLoading) {
    return (
      <section className="section-block">
        <div className="container">
          <ContentLoader message="Carregando página..." />
        </div>
      </section>
    );
  }
  if (isError || !page) return <div className="container" style={{ padding: '2rem 0' }}>Página não encontrada.</div>;

  return (
    <section className="section-block">
      <div className="container" style={{ display: 'grid', gap: '1.25rem' }}>
        <SeoHead title={page.title} description={page.description ?? page.title} />
        <div className="section-title contact-page-hero">
          <h1 style={{ margin: 0 }}>{page.title}</h1>
          {page.description && <p className="contact-page-description">{page.description}</p>}
        </div>
        <PageRenderer layout={page.layout} pageSlug={page.slug || 'contato'} />
      </div>
    </section>
  );
}
