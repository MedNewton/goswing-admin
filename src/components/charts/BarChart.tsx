interface BarChartProps {
  title: string;
  data?: Array<{ label: string; value: number }>;
  color?: string;
  formatValue?: (value: number) => string;
}

export function BarChart({ title, data, color = "bg-green-500", formatValue }: BarChartProps) {
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

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
      <div className="relative h-64">
        <div className="absolute inset-0 flex items-end justify-around gap-2">
          {data.map((item) => {
            const heightPct = (item.value / maxValue) * 100;
            return (
              <div key={item.label} className="group flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-medium text-gray-700 opacity-0 transition-opacity group-hover:opacity-100">
                  {formatValue ? formatValue(item.value) : item.value.toLocaleString()}
                </span>
                <div
                  className={`w-full ${color} rounded-t transition-all`}
                  style={{ height: `${heightPct}%` }}
                />
                <span className="text-xs text-gray-600">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
