import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faDesktop, faMobileScreenButton, faTabletScreenButton } from '@fortawesome/free-solid-svg-icons';
import { SegmentedControl } from '@/components/SegmentedControl';
import { readPagePreview } from '@/utils/pagePreview';
import '@/admin.css';

type Device = 'desktop' | 'tablet' | 'mobile';

/**
 * Aberta via window.open() pelo editor (ver utils/pagePreview.ts). O conteúdo
 * em si roda num <iframe> apontando pra /admin/preview-frame — isso dá a ele
 * uma viewport real e separada, então os breakpoints de tablet/mobile
 * realmente disparam (ao contrário de só escalar um <div> na mesma página).
 */
export function AdminPagePreviewPage() {
  const [device, setDevice] = useState<Device>('desktop');
  const preview = readPagePreview();
  const navigate = useNavigate();

  const handleBack = () => {
    // Preview normalmente é aberta via window.open() pelo editor: fechar a
    // aba é o esperado. Se não houver opener (ex.: aba acessada direto),
    // não há pra onde "fechar" — navega de volta pra lista de páginas.
    if (window.opener) {
      window.close();
    } else {
      navigate('/admin/pages');
    }
  };

  return (
    <div className="page-preview-screen">
      <div className="page-preview-toolbar">
        <button className="btn btn-ghost" type="button" onClick={handleBack}>
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Voltar ao editor</span>
        </button>

        {preview && <span className="page-preview-title">{preview.title || 'Pré-visualização'}</span>}

        <SegmentedControl<Device>
          ariaLabel="Dispositivo de visualização"
          value={device}
          options={[
            { value: 'desktop', label: 'Desktop', icon: faDesktop },
            { value: 'tablet', label: 'Tablet', icon: faTabletScreenButton },
            { value: 'mobile', label: 'Mobile', icon: faMobileScreenButton }
          ]}
          onChange={setDevice}
        />
      </div>

      <div className="page-preview-body">
        {preview ? (
          <iframe
            key={device}
            title="Pré-visualização da página"
            src="/admin/preview-frame"
            className={`page-preview-iframe device-${device}`}
          />
        ) : (
          <div className="admin-empty">
            <p>Nenhuma pré-visualização disponível. Volte ao editor e clique em "Pré-visualizar sem publicar".</p>
          </div>
        )}
      </div>
    </div>
  );
}
