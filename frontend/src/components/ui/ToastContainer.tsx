import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToast, Toast, ToastType } from '../../hooks/useToast';

// ─── Configuración visual por tipo ───────────────────────────────────────────
const CONFIG: Record<ToastType, {
  icon: React.ReactNode;
  bar: string;
  iconColor: string;
  bg: string;
  border: string;
}> = {
  success: {
    icon:      <CheckCircle2 size={18} />,
    bar:       'bg-emerald-500',
    iconColor: 'text-emerald-500',
    bg:        'rgba(16,185,129,0.08)',
    border:    'rgba(16,185,129,0.25)',
  },
  error: {
    icon:      <XCircle size={18} />,
    bar:       'bg-red-500',
    iconColor: 'text-red-500',
    bg:        'rgba(239,68,68,0.08)',
    border:    'rgba(239,68,68,0.25)',
  },
  warning: {
    icon:      <AlertTriangle size={18} />,
    bar:       'bg-amber-500',
    iconColor: 'text-amber-500',
    bg:        'rgba(245,158,11,0.08)',
    border:    'rgba(245,158,11,0.25)',
  },
  info: {
    icon:      <Info size={18} />,
    bar:       'bg-blue-500',
    iconColor: 'text-blue-400',
    bg:        'rgba(59,130,246,0.08)',
    border:    'rgba(59,130,246,0.25)',
  },
};

function ToastItem({ toast }: { toast: Toast }) {
  const { dismiss } = useToast();
  const cfg = CONFIG[toast.type];

  return (
    <div
      role="alert"
      className={`
        flex items-start gap-3 rounded-2xl px-4 py-3 shadow-lg
        min-w-[280px] max-w-[380px] relative overflow-hidden
        ${toast.leaving ? 'animate-toast-out' : 'animate-toast-in'}
      `}
      style={{
        background: 'var(--bg-surface-strong)',
        border:     `1px solid ${cfg.border}`,
        boxShadow:  '0 4px 24px rgba(0,0,0,0.15)',
      }}
    >
      {/* Barra de color lateral */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${cfg.bar}`} />

      {/* Ícono */}
      <span className={`flex-shrink-0 mt-0.5 ${cfg.iconColor}`}>{cfg.icon}</span>

      {/* Mensaje */}
      <p className="flex-1 text-sm font-medium t-primary leading-snug pr-1">
        {toast.message}
      </p>

      {/* Botón cerrar */}
      <button
        onClick={() => dismiss(toast.id)}
        className="flex-shrink-0 t-faint hover:t-primary transition-colors mt-0.5"
        aria-label="Cerrar"
      >
        <X size={15} />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts } = useToast();
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} />
        </div>
      ))}
    </div>
  );
}
