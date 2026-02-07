import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?:
    | "published"
    | "draft"
    | "pending"
    | "confirmed"
    | "completed"
    | "cancelled"
    | "active"
    | "paused";
  className?: string;
}

export function Badge({
  children,
  variant = "published",
  className = "",
}: BadgeProps) {
  const variants = {
    published: "bg-green-100 text-green-700",
    draft: "bg-yellow-100 text-yellow-700",
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-green-100 text-green-700",
    completed: "bg-blue-100 text-blue-700",
    cancelled: "bg-red-100 text-red-700",
    active: "bg-green-100 text-green-700",
    paused: "bg-yellow-100 text-yellow-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
