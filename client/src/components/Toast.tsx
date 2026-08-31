import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import ReactDOM from 'react-dom';
import { useHasMounted } from '../hooks/useHasMounted';
import { ToastContext, setToastAdder, type ToastItem, type ToastInput, type ToastStatus } from './toastStore';

// ─── Provider ────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback((toast: ToastInput) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  // Registrar o add global
  useEffect(() => {
    setToastAdder(add);
    return () => setToastAdder(null);
  }, [add]);

  return (
    <ToastContext.Provider value={{ add, remove }}>
      {children}
      <Toaster toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  );
}

// ─── Toaster (container) ─────────────────────────────────────────────────────

function Toaster({ toasts, onRemove }: { toasts: ToastItem[]; onRemove: (id: string) => void }) {
  const mounted = useHasMounted();
  if (!mounted) return null;

  return ReactDOM.createPortal(
    <div className="toast-container" role="region" aria-label="Notificações" aria-live="polite">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>,
    document.body
  );
}

// ─── Card individual ─────────────────────────────────────────────────────────

// Paths no viewBox 512x512 (ícones "circle-*" sólidos)
const STATUS_ICON_PATH: Record<ToastStatus, string> = {
  success:
    'M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z',
  error:
    'M256 48a208 208 0 1 1 0 416 208 208 0 1 1 0-416zm0 464A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c-9.4 9.4-9.4 24.6 0 33.9l47 47-47 47c-9.4 9.4-9.4 24.6 0 33.9s24.6 9.4 33.9 0l47-47 47 47c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-47-47 47-47c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-47 47-47-47c-9.4-9.4-24.6-9.4-33.9 0z',
  warning:
    'M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM232 152c0-13.3 10.7-24 24-24s24 10.7 24 24V264c0 13.3-10.7 24-24 24s-24-10.7-24-24V152zM256 400a32 32 0 1 1 0-64 32 32 0 1 1 0 64z',
  info:
    'M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z',
};

const STATUS_META: Record<ToastStatus, { label: string; icon: string }> = {
  success: { label: 'Sucesso',  icon: STATUS_ICON_PATH.success },
  error:   { label: 'Erro',     icon: STATUS_ICON_PATH.error },
  warning: { label: 'Atenção',  icon: STATUS_ICON_PATH.warning },
  info:    { label: 'Informação', icon: STATUS_ICON_PATH.info },
};

const DEFAULT_DURATION: Record<ToastStatus, number> = {
  success: 4000,
  error:   0,      // erros ficam até o usuário fechar
  warning: 8000,
  info:    5000,
};

function ToastCard({ toast, onRemove }: { toast: ToastItem; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const duration = toast.duration !== undefined ? toast.duration : DEFAULT_DURATION[toast.status];
  const meta = STATUS_META[toast.status];

  // Entrada com pequeno delay para o CSS de fade-in funcionar
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, []);

  // Auto-fechar
  useEffect(() => {
    if (duration === 0) return;
    timerRef.current = setTimeout(() => handleClose(), duration);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onRemove(toast.id), 280);
  };

  const handleCopyCode = () => {
    if (!toast.code) return;
    navigator.clipboard.writeText(toast.code).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  return (
    <div
      className={`toast-card toast-card--${toast.status} ${visible ? 'toast-card--visible' : ''}`}
      role="alert"
    >
      {/* Onda decorativa de fundo */}
      <svg className="toast-wave" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          fillOpacity="1"
          d="M0,256L11.4,240C22.9,224,46,192,69,192C91.4,192,114,224,137,234.7C160,245,183,235,206,213.3C228.6,192,251,160,274,149.3C297.1,139,320,149,343,181.3C365.7,213,389,267,411,282.7C434.3,299,457,277,480,250.7C502.9,224,526,192,549,181.3C571.4,171,594,181,617,208C640,235,663,277,686,256C708.6,235,731,149,754,122.7C777.1,96,800,128,823,165.3C845.7,203,869,245,891,224C914.3,203,937,117,960,112C982.9,107,1006,181,1029,197.3C1051.4,213,1074,171,1097,144C1120,117,1143,107,1166,133.3C1188.6,160,1211,224,1234,218.7C1257.1,213,1280,139,1303,133.3C1325.7,128,1349,192,1371,192C1394.3,192,1417,128,1429,96L1440,64L1440,320L1428.6,320C1417.1,320,1394,320,1371,320C1348.6,320,1326,320,1303,320C1280,320,1257,320,1234,320C1211.4,320,1189,320,1166,320C1142.9,320,1120,320,1097,320C1074.3,320,1051,320,1029,320C1005.7,320,983,320,960,320C937.1,320,914,320,891,320C868.6,320,846,320,823,320C800,320,777,320,754,320C731.4,320,709,320,686,320C662.9,320,640,320,617,320C594.3,320,571,320,549,320C525.7,320,503,320,480,320C457.1,320,434,320,411,320C388.6,320,366,320,343,320C320,320,297,320,274,320C251.4,320,229,320,206,320C182.9,320,160,320,137,320C114.3,320,91,320,69,320C45.7,320,23,320,11,320L0,320Z"
        />
      </svg>

      {/* Ícone de status */}
      <div className="toast-icon-container" aria-hidden="true">
        <svg className="toast-icon" viewBox="0 0 512 512" fill="currentColor">
          <path d={meta.icon} />
        </svg>
      </div>

      {/* Texto */}
      <div className="toast-body">
        <span className="toast-sr-only">{meta.label}: </span>
        <p className="toast-title">{toast.title}</p>

        {toast.message && (
          <p className="toast-message">{toast.message}</p>
        )}

        {toast.code && (
          <button
            className="toast-code"
            onClick={handleCopyCode}
            title="Clique para copiar o código de erro"
            type="button"
          >
            <span className="toast-code-label">Código:</span>
            <code>{toast.code}</code>
            <span className="toast-code-copy">{codeCopied ? 'Copiado!' : 'Copiar'}</span>
          </button>
        )}
      </div>

      {/* Fechar */}
      <button
        className="toast-close"
        onClick={handleClose}
        aria-label="Fechar notificação"
        type="button"
      >
        <svg viewBox="0 0 15 15" fill="none" stroke="currentColor" className="toast-close-icon">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            fill="currentColor"
            d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
          />
        </svg>
      </button>
    </div>
  );
}
