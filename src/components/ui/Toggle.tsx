"use client";

interface ToggleProps {
  label?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

export function Toggle({ label, checked = false, onChange }: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between">
      {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
        />
        <div
          className={`h-6 w-11 rounded-full transition-colors ${
            checked ? "bg-gray-900" : "bg-gray-300"
          }`}
        >
          <div
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              checked ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </div>
      </div>
    </label>
  );
}
