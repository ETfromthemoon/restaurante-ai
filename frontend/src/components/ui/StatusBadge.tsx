interface StatusBadgeProps {
  status: string;
  label?: string;
}

const statusConfig: Record<string, { color: string; dotClass: string }> = {
  free:      { color: 'text-emerald-400', dotClass: 'bg-emerald-400 shadow-[0_0_6px_theme(colors.emerald.400)]' },
  occupied:  { color: 'text-red-400',     dotClass: 'bg-red-400 shadow-[0_0_6px_theme(colors.red.400)]' },
  ready:     { color: 'text-emerald-300', dotClass: 'bg-emerald-300 shadow-[0_0_6px_theme(colors.emerald.300)]' },
  served:    { color: 'text-blue-400',    dotClass: 'bg-blue-400 shadow-[0_0_6px_theme(colors.blue.400)]' },
  billing:   { color: 'text-yellow-400',  dotClass: 'bg-yellow-400 shadow-[0_0_6px_theme(colors.yellow.400)]' },
  billed:    { color: 'text-emerald-400', dotClass: 'bg-emerald-400 shadow-[0_0_6px_theme(colors.emerald.400)]' },
  open:      { color: 'text-slate-400',   dotClass: 'bg-slate-400 shadow-[0_0_6px_theme(colors.slate.400)]' },
  kitchen:   { color: 'text-orange-400',  dotClass: 'bg-orange-400 shadow-[0_0_6px_theme(colors.orange.400)]' },
  pending:   { color: 'text-slate-400',   dotClass: 'bg-slate-400 shadow-[0_0_6px_theme(colors.slate.400)]' },
  preparing: { color: 'text-orange-400',  dotClass: 'bg-orange-400 shadow-[0_0_6px_theme(colors.orange.400)]' },
  done:      { color: 'text-emerald-400', dotClass: 'bg-emerald-400 shadow-[0_0_6px_theme(colors.emerald.400)]' },
};

const statusLabels: Record<string, string> = {
  free: 'Libre', occupied: 'Ocupada', ready: 'Lista', served: 'Servida',
  billing: 'Cobrando', billed: 'Cobrada', open: 'Abierto', kitchen: 'En cocina',
  pending: 'Pendiente', preparing: 'Preparando', done: 'Listo',
};

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const cfg = statusConfig[status] ?? statusConfig.open;
  const text = label ?? statusLabels[status] ?? status;

  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
      {text}
    </span>
  );
}
