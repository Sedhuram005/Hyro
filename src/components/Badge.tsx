interface BadgeProps {
  value: string;
  variant?: 'high' | 'medium' | 'low' | 'neutral' | 'positive' | 'negative' | 'ai' | 'form';
}

export default function Badge({ value, variant }: BadgeProps) {
  const styles: Record<string, string> = {
    high: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    medium: 'bg-amber-100 text-amber-700 border border-amber-200',
    low: 'bg-red-100 text-red-700 border border-red-200',
    neutral: 'bg-slate-100 text-slate-600 border border-slate-200',
    positive: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    negative: 'bg-red-100 text-red-700 border border-red-200',
    ai: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    form: 'bg-slate-100 text-slate-600 border border-slate-200',
  };

  const v = variant ?? 'neutral';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[v] ?? styles.neutral}`}>
      {value}
    </span>
  );
}
