import { useEffect, useState } from 'react';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import { OnboardingStep } from './onboardingSteps';

interface Props {
  steps: OnboardingStep[];
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

const TOOLTIP_W = 290;
const GAP       = 14;
const PAD       = 10;

export default function OnboardingOverlay({ steps, currentStep, onNext, onPrev, onSkip }: Props) {
  const step = steps[currentStep];
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!step) return;

    // Reset rect immediately so spotlight doesn't stay on wrong element during navigation
    setRect(null);

    // Wait for navigation + page render before searching for the element
    const t = setTimeout(() => {
      // Pick the first element with visible dimensions (handles desktop/mobile duplicates)
      const candidates = document.querySelectorAll<HTMLElement>(`[data-onboarding-id="${step.id}"]`);
      const el = Array.from(candidates).find(e => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      // Second delay for scroll to settle
      setTimeout(() => setRect(el.getBoundingClientRect()), 350);
    }, 750);

    return () => clearTimeout(t);
  }, [step]);

  if (!step) return null;

  /* ── Spotlight position ── */
  const spotlight = rect
    ? {
        left:   rect.left   - PAD,
        top:    rect.top    - PAD,
        width:  rect.width  + PAD * 2,
        height: rect.height + PAD * 2,
      }
    : null;

  /* ── Tooltip position ── */
  let tooltipStyle: React.CSSProperties = {};
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (rect) {
    const safeLeft = (x: number) => Math.max(12, Math.min(x, vw - TOOLTIP_W - 12));

    switch (step.placement) {
      case 'bottom':
        tooltipStyle = {
          top:  rect.bottom + PAD + GAP,
          left: safeLeft(rect.left),
        };
        break;
      case 'top':
        tooltipStyle = {
          bottom: vh - rect.top + PAD + GAP,
          left:   safeLeft(rect.left),
        };
        break;
      case 'right':
        tooltipStyle = {
          top:  Math.max(12, rect.top),
          left: rect.right + PAD + GAP,
        };
        break;
      case 'left':
        tooltipStyle = {
          top:   Math.max(12, rect.top),
          right: vw - rect.left + PAD + GAP,
        };
        break;
    }
  } else {
    tooltipStyle = { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };
  }

  return (
    <div
      className="fixed inset-0 z-[200]"
      style={{ pointerEvents: 'all' }}
      onClick={onSkip}
    >
      {/* Spotlight creates the dark backdrop via box-shadow */}
      {spotlight ? (
        <div
          className="absolute rounded-xl pointer-events-none"
          style={{
            ...spotlight,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.62)',
            transition: 'all 0.25s ease',
            zIndex: 201,
          }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.62)' }} />
      )}

      {/* Tooltip bubble */}
      <div
        className="absolute z-[202]"
        style={{ width: TOOLTIP_W, ...tooltipStyle }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'var(--bg-surface-strong, #1e293b)',
            border: '1px solid rgba(16,185,129,0.25)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(16,185,129,0.08)',
          }}
        >
          {/* Header row */}
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10px] font-semibold text-accent uppercase tracking-[0.12em]">
              Paso {currentStep + 1} / {steps.length}
            </span>
            <button onClick={onSkip} className="t-muted hover:t-primary transition-colors" title="Saltar guía">
              <X size={14} />
            </button>
          </div>

          {/* Title */}
          <h4 className="font-semibold text-sm t-primary mb-1.5 leading-snug">{step.title}</h4>

          {/* Description */}
          <p className="text-xs t-secondary font-light leading-relaxed mb-4">{step.description}</p>

          {/* Progress dots */}
          <div className="flex items-center gap-1 mb-3.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width:      i === currentStep ? 18 : 6,
                  height:     6,
                  background: i === currentStep
                    ? '#10b981'
                    : i < currentStep
                    ? 'rgba(16,185,129,0.35)'
                    : 'var(--border-strong, #334155)',
                }}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={onPrev}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl btn-ghost flex-1 justify-center"
              >
                <ArrowLeft size={12} />
                Anterior
              </button>
            )}
            <button
              onClick={onNext}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl btn-accent flex-1 justify-center"
            >
              {currentStep === steps.length - 1 ? 'Finalizar' : 'Siguiente'}
              {currentStep < steps.length - 1 && <ArrowRight size={12} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
