import { SeoHead } from '../components/SeoHead';
import { useCurrentUser } from '../hooks/queries/useCurrentUser';
import { DashboardMetrics } from '../components/DashboardMetrics';

export function AdminDashboardPage() {
  const { data: user } = useCurrentUser();
  const userName = user?.name || 'Admin';

  return (
    <div className="admin-page">
      <SeoHead title="Painel" />
      <div className="admin-page-header">
        <h1 style={{ margin: 0 }}>Olá, {userName}</h1>
        <p style={{ margin: 0, color: 'var(--color-forest)' }}>Edite o conteúdo que já existe, crie novos, remova antigos. Tudo que você precisa está aqui. </p>
      </div>

      <DashboardMetrics />

      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Gerenciamento</h3>
      </div>
      <div className="admin-grid columns-3">
        {[
          { title: 'Barra de navegação', desc: 'Gerencie itens de navegação', href: '/admin/navbar' },
          { title: 'Página inicial', desc: 'Configure seções e botões de chamada para ação', href: '/admin/home' },
          { title: 'Artigos', desc: 'Publique e edite posts', href: '/admin/articles' },
          { title: 'Imagens', desc: 'Envie e gerencie mídia', href: '/admin/media' }
        ].map((item) => (
          <a key={item.title} className="admin-card link" href={item.href} style={{ display: 'grid', gap: '0.4rem' }}>
            <strong>{item.title}</strong>
            <p style={{ margin: 0, color: 'var(--color-forest)' }}>{item.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
