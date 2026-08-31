import { Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPage } from '../api/queries';
import { SeoHead } from '../components/SeoHead';
import { ContentLoader } from '../components/ContentLoader';
import { PageRenderer } from '../components/PageRenderer';

export function DynamicPage() {
  const { slug = '' } = useParams();
  const { data: page, isLoading, isError } = useQuery({
    queryKey: ['page', slug],
    queryFn: () => fetchPage(slug),
    enabled: !!slug && slug !== 'home'
  });

  if (slug === 'home') return <Navigate to="/" replace />;

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
        {/* title/description ficam só no SEO; o conteúdo visível é definido pelos blocos,
            espelhando o que o builder mostra (sem cabeçalho de página duplicado). */}
        <SeoHead title={page.title} description={page.description ?? page.title} />
        <PageRenderer layout={page.layout} pageSlug={page.slug || slug} />
      </div>
    </section>
  );
}
