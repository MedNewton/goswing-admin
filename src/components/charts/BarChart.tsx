interface BarChartProps {
  title: string;
  data?: Array<{ month: string; value: number }>;
}

export function BarChart({ title }: BarChartProps) {
  const data = [
    { month: "Jan", value: 4500 },
    { month: "Feb", value: 5500 },
    { month: "Mar", value: 5000 },
    { month: "Apr", value: 6500 },
    { month: "May", value: 6000 },
    { month: "Jun", value: 7500 },
  ];

  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
      <div className="relative h-64">
        <div className="absolute inset-0 flex items-end justify-around gap-2">
          {data.map((item) => (
            <div key={item.month} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="w-full bg-green-500 rounded-t"
                style={{ height: `${(item.value / maxValue) * 100}%` }}
              />
              <span className="text-xs text-gray-600">{item.month}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
