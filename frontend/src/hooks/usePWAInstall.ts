/**
 * usePWAInstall
 *
 * Gestiona todo el flujo de instalación PWA:
 *   - Android / Chrome / Edge : captura el evento `beforeinstallprompt` y lo
 *     dispara cuando el usuario hace clic en "Instalar".
 *   - iOS / Safari            : detecta el entorno y devuelve `isIOS = true`
 *     para que el componente muestre las instrucciones manuales.
 *   - Ya instalada            : detecta el modo `standalone` y devuelve
 *     `isInstalled = true` para ocultar cualquier aviso.
 */
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallState {
  /** Chrome/Edge: hay prompt disponible para disparar */
  canInstall: boolean;
  /** Safari en iPhone/iPad — requiere instrucciones manuales */
  isIOS: boolean;
  /** La app ya está instalada (modo standalone) */
  isInstalled: boolean;
  /** Llama al prompt nativo de instalación (solo Chrome/Edge) */
  promptInstall: () => Promise<void>;
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // ─── Detectar si ya está instalada en modo standalone ───────────────────
  const isInstalled =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  // ─── Detectar iOS Safari ─────────────────────────────────────────────────
  const isIOS =
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
    !(window.navigator as any).standalone;

  // ─── Capturar el evento beforeinstallprompt (Chrome / Edge / Android) ────
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();                         // evitar el mini-banner nativo
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Limpiar si el usuario instala la app
    window.addEventListener('appinstalled', () => setDeferredPrompt(null));

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // ─── Función para disparar el prompt de Chrome/Edge ──────────────────────
  const promptInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  return {
    canInstall:    !!deferredPrompt,
    isIOS:         isIOS && !isInstalled,
    isInstalled,
    promptInstall,
  };
}
