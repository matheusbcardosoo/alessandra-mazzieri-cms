import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileAlt, faPencil, faBlog, faNoteSticky, faEye, faImage, faChartLine } from '@fortawesome/free-solid-svg-icons';
import { useMetrics } from '../hooks/queries/useMetrics';
import { useQuery } from '@tanstack/react-query';
import { fetchAdminSiteSettings } from '../api/queries';
import { AnimatedCounter } from './AnimatedCounter';
import type { SiteSettings } from '../types';

export function DashboardMetrics() {
  const { data: metrics, isLoading } = useMetrics();
  const { data: settings } = useQuery<SiteSettings>({
    queryKey: ['adminSiteSettings'],
    queryFn: fetchAdminSiteSettings,
    staleTime: 5 * 60 * 1000
  });

  const primaryColor = settings?.theme?.colors?.primary || 'var(--color-primary)';

  if (isLoading || !metrics) {
    return (
      <div className="metrics-grid">
        <div className="metric-card skeleton">Carregando...</div>
        <div className="metric-card skeleton">Carregando...</div>
        <div className="metric-card skeleton">Carregando...</div>
        <div className="metric-card skeleton">Carregando...</div>
        <div className="metric-card skeleton">Carregando...</div>
        <div className="metric-card skeleton">Carregando...</div>
      </div>
    );
  }

  const metricsList = [
    {
      label: 'Páginas Publicadas',
      value: metrics.pagesPublished,
      icon: faFileAlt,
      color: 'primary'
    },
    {
      label: 'Páginas em Rascunho',
      value: metrics.pagesDraft,
      icon: faPencil,
      color: 'warning'
    },
    {
      label: 'Artigos Publicados',
      value: metrics.articlesPublished,
      icon: faBlog,
      color: 'success'
    },
    {
      label: 'Artigos em Rascunho',
      value: metrics.articlesDraft,
      icon: faNoteSticky,
      color: 'warning'
    },
    {
      label: 'Visualizações de Artigos',
      value: metrics.totalArticleViews,
      icon: faEye,
      color: 'info'
    },
    {
      label: 'Imagens no Banco',
      value: metrics.totalImages,
      icon: faImage,
      color: 'secondary'
    }
  ];

  return (
    <div className="metrics-section">
      <div className="metrics-header">
        <FontAwesomeIcon icon={faChartLine} style={{ color: primaryColor }} />
        <h2 style={{ color: primaryColor }}>Analytics Rápido</h2>
      </div>
      <div className="metrics-grid">
        {metricsList.map((metric) => (
          <div key={metric.label} className="metric-card" style={{ '--metric-color': primaryColor } as React.CSSProperties}>
            <FontAwesomeIcon icon={metric.icon} className="metric-icon-watermark" />
            <div className="metric-label">{metric.label}</div>
            <div className="metric-value">
              <AnimatedCounter value={metric.value} duration={1200} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
