interface LineChartProps {
  title: string;
  data?: Array<{ label: string; value: number }>;
  color?: string;
  formatValue?: (value: number) => string;
}

export function LineChart({ title, data, color = "#3b82f6", formatValue }: LineChartProps) {
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

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
      <div className="relative h-64">
        <svg className="h-full w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
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
          {/* Line */}
          <polyline
            points={polylinePoints}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Data points */}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="white" stroke={color} strokeWidth="2" />
          ))}
        </svg>
        {/* X-axis labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-around px-5 text-xs text-gray-500">
          {data.map((d) => (
            <span key={d.label}>{d.label}</span>
          ))}
        </div>
        {/* Tooltip on hover — rendered via title for simplicity */}
        <div className="absolute inset-0 flex justify-around px-5">
          {data.map((d) => (
            <div key={d.label} className="flex-1" title={`${d.label}: ${formatValue ? formatValue(d.value) : d.value.toLocaleString()}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
