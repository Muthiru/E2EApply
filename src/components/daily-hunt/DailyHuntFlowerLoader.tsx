import type { ComponentProps } from "react";

export function DailyHuntFlowerLoader({
  className,
  ...props
}: ComponentProps<"svg">) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      fill="none"
      className={`animate-spin ${className ?? ""}`}
      {...props}
    >
      <ellipse cx="24" cy="9" rx="3.2" ry="6.2" fill="#ef6258" />
      <ellipse cx="24" cy="9" rx="3.2" ry="6.2" fill="#f28c52" transform="rotate(60 24 24)" />
      <ellipse cx="24" cy="9" rx="3.2" ry="6.2" fill="#f3bd58" transform="rotate(120 24 24)" />
      <ellipse cx="24" cy="9" rx="3.2" ry="6.2" fill="#8caf75" transform="rotate(180 24 24)" />
      <ellipse cx="24" cy="9" rx="3.2" ry="6.2" fill="#e9ae55" transform="rotate(240 24 24)" />
      <ellipse cx="24" cy="9" rx="3.2" ry="6.2" fill="#ee7558" transform="rotate(300 24 24)" />
    </svg>
  );
}
