/**
 * PWAInstallBanner
 *
 * Se muestra automáticamente en dos situaciones:
 *   1. iOS Safari  → instrucciones manuales "Toca ⬆️ → Añadir a pantalla..."
 *   2. Chrome/Edge → botón que dispara el prompt nativo del navegador
 *
 * Se descarta con el botón ✕ y no vuelve a aparecer (localStorage).
 */
import { useState, useEffect } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { X, Download, Share } from 'lucide-react';

const DISMISSED_KEY = 'pwa_install_dismissed';

export default function PWAInstallBanner() {
  const { canInstall, isIOS, isInstalled, promptInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible]     = useState(false);

  // Leer dismissed de localStorage al montar
  useEffect(() => {
    const saved = localStorage.getItem(DISMISSED_KEY);
    if (saved) setDismissed(true);
  }, []);

  // Mostrar el banner con un pequeño retraso (no interrumpir la carga inicial)
  useEffect(() => {
    if ((canInstall || isIOS) && !dismissed && !isInstalled) {
      const t = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(t);
    }
  }, [canInstall, isIOS, dismissed, isInstalled]);

  const dismiss = () => {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, '1');
  };

  const handleInstall = async () => {
    await promptInstall();
    dismiss();
  };

  if (!visible) return null;

  // ─── iOS Safari: instrucciones manuales ──────────────────────────────────
  if (isIOS) {
    return (
      <div
        className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-6 animate-slide-up"
        style={{
          background: 'var(--bg-surface-strong)',
          borderTop: '1px solid var(--border)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
        }}
      >
        <div className="max-w-md mx-auto">
          {/* Encabezado */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center text-white text-lg flex-shrink-0">
                🍽️
              </div>
              <div>
                <p className="font-bold t-primary text-sm">Instala Restaurante AI</p>
                <p className="text-xs t-muted">Acceso directo desde tu pantalla de inicio</p>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="t-faint hover:t-primary transition-colors flex-shrink-0 mt-0.5"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Pasos */}
          <div
            className="rounded-xl p-3 space-y-2"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">1</div>
              <p className="text-sm t-secondary">
                Toca el botón de compartir{' '}
                <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded px-1.5 py-0.5 text-xs font-semibold">
                  <Share size={11} /> Compartir
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">2</div>
              <p className="text-sm t-secondary">
                Baja y selecciona{' '}
                <span className="font-semibold t-primary">"Añadir a pantalla de inicio"</span>
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">3</div>
              <p className="text-sm t-secondary">Confirma el nombre y toca <span className="font-semibold t-primary">"Añadir"</span></p>
            </div>
          </div>

          <button onClick={dismiss} className="w-full mt-3 btn-ghost rounded-xl py-2 text-sm font-medium">
            Ahora no
          </button>
        </div>
      </div>
    );
  }

  // ─── Chrome / Edge / Android: prompt nativo ───────────────────────────────
  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 rounded-2xl p-4 animate-slide-up"
      style={{
        background: 'var(--bg-surface-strong)',
        border: '1px solid var(--border)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        maxWidth: '420px',
        margin: '0 auto',
      }}
    >
      <div className="flex items-center gap-3">
        {/* Ícono */}
        <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center text-white text-xl flex-shrink-0">
          🍽️
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          <p className="font-bold t-primary text-sm">Instalar Restaurante AI</p>
          <p className="text-xs t-muted mt-0.5">
            Acceso rápido · Funciona sin internet · Sin tienda de apps
          </p>
        </div>

        {/* Cerrar */}
        <button onClick={dismiss} className="t-faint hover:t-primary transition-colors flex-shrink-0">
          <X size={18} />
        </button>
      </div>

      {/* Botones */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleInstall}
          className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 text-sm font-bold transition-colors"
        >
          <Download size={15} />
          Instalar app
        </button>
        <button onClick={dismiss} className="btn-ghost rounded-xl px-4 py-2.5 text-sm font-medium">
          Ahora no
        </button>
      </div>
    </div>
  );
}
