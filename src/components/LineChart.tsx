interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  fillGradient?: boolean;
}

export default function LineChart({
  data,
  height = 200,
  color = '#059669',
  fillGradient = true,
}: LineChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-slate-400" style={{ height }}>
        No data to display
      </div>
    );
  }

  const width = 600;
  const padding = { top: 20, right: 20, bottom: 30, left: 36 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const minVal = 0;
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const x = padding.left + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
    const y = padding.top + chartH - ((d.value - minVal) / range) * chartH;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  // Y-axis grid lines (4 segments)
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(t => {
    const y = padding.top + chartH - t * chartH;
    const val = Math.round(minVal + t * range);
    return { y, val };
  });

  const gid = `grad-${color.replace('#', '')}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {gridLines.map((g, i) => (
        <g key={i}>
          <line
            x1={padding.left}
            y1={g.y}
            x2={width - padding.right}
            y2={g.y}
            stroke="#e2e8f0"
            strokeWidth="1"
            strokeDasharray={i === 0 ? '0' : '3 3'}
          />
          <text x={padding.left - 8} y={g.y + 3} textAnchor="end" className="fill-slate-400" style={{ fontSize: 10 }}>
            {g.val}
          </text>
        </g>
      ))}

      {/* Area fill */}
      {fillGradient && <path d={areaPath} fill={`url(#${gid})`} />}

      {/* Line */}
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="white" stroke={color} strokeWidth="2.5" />
          <text x={p.x} y={p.y - 10} textAnchor="middle" className="fill-slate-700" style={{ fontSize: 10, fontWeight: 600 }}>
            {p.value}
          </text>
          <text x={p.x} y={height - 8} textAnchor="middle" className="fill-slate-400" style={{ fontSize: 10 }}>
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
