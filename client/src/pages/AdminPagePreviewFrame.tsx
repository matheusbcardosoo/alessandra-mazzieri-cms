import { readPagePreview } from '@/utils/pagePreview';
import { PageRenderer } from '@/components/PageRenderer';

/**
 * Renderizada dentro do <iframe> de /admin/preview, aninhada na mesma
 * PublicLayout do site público (ver AppRoutes.tsx) — assim ganha navbar,
 * rodapé e WhatsApp reais, iguais aos do site publicado. O conteúdo em si
 * vem do sessionStorage (herdado do documento pai por ser same-origin),
 * nunca do banco, então reflete alterações ainda não publicadas.
 */
export function AdminPagePreviewFrame() {
  const preview = readPagePreview();

  if (!preview) {
    return (
      <section className="section-block">
        <div className="container" style={{ padding: '2rem 0' }}>
          Nenhuma pré-visualização disponível. Volte ao editor e clique em "Pré-visualizar sem publicar".
        </div>
      </section>
    );
  }

  return (
    <section className="section-block" style={preview.isHomePage ? { paddingTop: 0 } : undefined}>
      <div className="container" style={{ display: 'grid', gap: '1.25rem' }}>
        <PageRenderer layout={preview.layout} pageSlug={preview.slug || 'preview'} />
      </div>
    </section>
  );
}
