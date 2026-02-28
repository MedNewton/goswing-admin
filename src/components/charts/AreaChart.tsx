interface AreaChartProps {
  title: string;
  data?: Array<{ label: string; value: number }>;
  color?: string;
  formatValue?: (value: number) => string;
}

export function AreaChart({ title, data, color = "#a78bfa", formatValue }: AreaChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex h-64 items-center justify-center text-sm text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const padding = 20;
  const width = 400;
  const height = 200;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const points = data.map((d, i) => {
    const x = padding + (i / Math.max(data.length - 1, 1)) * chartW;
    const y = padding + chartH - (d.value / maxValue) * chartH;
    return { x, y, ...d };
  });

  const linePathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPathD = `${linePathD} L ${points[points.length - 1]!.x} ${padding + chartH} L ${points[0]!.x} ${padding + chartH} Z`;

  // Unique gradient ID to avoid conflicts when multiple AreaCharts render
  const gradientId = `areaGradient-${title.replace(/\s+/g, "-")}`;

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
      <div className="relative h-64">
        <svg className="h-full w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={color} stopOpacity="0.05" />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = padding + chartH - pct * chartH;
            return (
              <line
                key={pct}
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="0.5"
              />
            );
          })}
          {/* Filled area */}
          <path d={areaPathD} fill={`url(#${gradientId})`} />
          {/* Line on top */}
          <path d={linePathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {/* Data points */}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill="white" stroke={color} strokeWidth="1.5" />
          ))}
        </svg>
        {/* X-axis labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-around px-5 text-xs text-gray-500">
          {data.map((d) => (
            <span key={d.label}>{d.label}</span>
          ))}
        </div>
        {/* Hover zones */}
        <div className="absolute inset-0 flex justify-around px-5">
          {data.map((d) => (
            <div key={d.label} className="flex-1" title={`${d.label}: ${formatValue ? formatValue(d.value) : d.value.toLocaleString()}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
