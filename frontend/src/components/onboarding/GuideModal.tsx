import { useState } from 'react';
import { X, BookOpen, ChevronRight, ChevronDown, PlayCircle } from 'lucide-react';
import { OnboardingStep } from './onboardingSteps';

interface Props {
  steps:        OnboardingStep[];
  role:         string;
  onClose:      () => void;
  onStartTour:  () => void;
}

const ROLE_LABEL: Record<string, string> = {
  waiter:  'Mesero',
  cook:    'Cocina',
  manager: 'Gerente',
};

export default function GuideModal({ steps, role, onClose, onStartTour }: Props) {
  const [expanded, setExpanded] = useState<number | null>(0);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{
          background: 'var(--bg-surface-strong)',
          border:     '1px solid var(--border-strong)',
          maxHeight:  '85vh',
          overflowY:  'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                 style={{ background: 'rgba(16,185,129,0.1)' }}>
              <BookOpen size={17} className="text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-base t-primary">Guía de uso</h3>
              <p className="text-[11px] t-muted font-light">{ROLE_LABEL[role] ?? role}</p>
            </div>
          </div>
          <button onClick={onClose} className="t-muted hover:t-primary transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Intro */}
        <p className="text-xs t-muted font-light mb-5 leading-relaxed">
          Aquí están los {steps.length} flujos principales para tu rol. Puedes leerlos aquí o
          iniciar el recorrido interactivo para que te los mostremos uno a uno en la pantalla.
        </p>

        {/* Steps accordion */}
        <div className="space-y-2 mb-6">
          {steps.map((step, i) => (
            <div
              key={step.id}
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid var(--border)' }}
            >
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
                style={{ background: expanded === i ? 'rgba(16,185,129,0.05)' : 'transparent' }}
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-xs font-medium t-primary">{step.title}</span>
                </div>
                {expanded === i
                  ? <ChevronDown size={14} className="t-muted flex-shrink-0" />
                  : <ChevronRight size={14} className="t-muted flex-shrink-0" />
                }
              </button>
              {expanded === i && (
                <div className="px-4 pb-3">
                  <p className="text-xs t-secondary font-light leading-relaxed pl-8">
                    {step.description}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onStartTour}
          className="btn-accent w-full flex items-center justify-center gap-2 text-sm"
        >
          <PlayCircle size={15} />
          Iniciar recorrido interactivo
        </button>
      </div>
    </div>
  );
}
