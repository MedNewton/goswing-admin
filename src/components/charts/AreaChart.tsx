interface AreaChartProps {
  title: string;
}

export function AreaChart({ title }: AreaChartProps) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
      <div className="relative h-64">
        {/* Placeholder area chart */}
        <svg className="h-full w-full" viewBox="0 0 400 200">
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path
            d="M 0 150 L 60 120 L 120 100 L 180 80 L 240 60 L 300 40 L 360 20 L 400 10 L 400 200 L 0 200 Z"
            fill="url(#areaGradient)"
            stroke="#a78bfa"
            strokeWidth="2"
          />
        </svg>
        <div className="absolute bottom-0 left-0 right-0 flex justify-around text-xs text-gray-500">
          {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((month) => (
            <span key={month}>{month}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
