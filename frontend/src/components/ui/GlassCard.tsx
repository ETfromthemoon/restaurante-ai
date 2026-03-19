import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'strong';
  glow?: boolean;
  onClick?: () => void;
}

export default function GlassCard({ children, className = '', variant = 'default', glow = false, onClick }: GlassCardProps) {
  const base = variant === 'strong' ? 'glass-strong' : 'glass-card';
  const glowClass = glow ? 'glow-accent' : '';
  const clickClass = onClick ? 'cursor-pointer hover:-translate-y-0.5 transition-transform' : '';

  return (
    <div className={`${base} ${glowClass} ${clickClass} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}
