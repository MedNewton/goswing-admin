interface LineChartProps {
  title: string;
  data?: Array<{ month: string; value: number }>;
}

export function LineChart({ title }: LineChartProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
      <div className="relative h-64">
        {/* Placeholder chart visualization */}
        <div className="absolute inset-0 flex items-end justify-around gap-2">
          {[40, 55, 45, 65, 60, 70].map((height, i) => (
            <div key={i} className="flex-1 flex flex-col justify-end">
              <div
                className="w-full bg-blue-500 rounded-t"
                style={{ height: `${height}%` }}
              />
            </div>
          ))}
        </div>
        <div className="absolute bottom-0 left-0 right-0 flex justify-around text-xs text-gray-500">
          {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((month) => (
            <span key={month}>{month}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
