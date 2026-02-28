import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?:
    | "published"
    | "draft"
    | "pending"
    | "confirmed"
    | "checkedIn"
    | "completed"
    | "cancelled"
    | "active"
    | "paused"
    | "default"
    | "success"
    | "warning"
    | "error"
    | "info"
    | "secondary";
  className?: string;
}

export function Badge({
  children,
  variant = "published",
  className = "",
}: BadgeProps) {
  const variants: Record<string, string> = {
    published: "bg-green-100 text-green-700",
    draft: "bg-yellow-100 text-yellow-700",
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-green-100 text-green-700",
    checkedIn: "bg-blue-100 text-blue-700",
    completed: "bg-blue-100 text-blue-700",
    cancelled: "bg-red-100 text-red-700",
    active: "bg-green-100 text-green-700",
    paused: "bg-yellow-100 text-yellow-700",
    // Semantic variants (used by statusVariant())
    default: "bg-gray-100 text-gray-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-yellow-100 text-yellow-700",
    error: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-700",
    secondary: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant] ?? variants.default} ${className}`}
    >
      {children}
    </span>
  );
}
