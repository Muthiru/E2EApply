"use client";

import type { ReactNode } from "react";
import { DailyHuntFlowerLoader } from "@/components/daily-hunt/DailyHuntFlowerLoader";

export function ActionLoadingOverlay({
  active,
  message,
  children,
}: Readonly<{
  active: boolean;
  message: string;
  children: ReactNode;
}>) {
  return (
    <div className={`action-loading-shell${active ? " is-loading" : ""}`} aria-busy={active}>
      <div className="action-loading-content">{children}</div>
      {active && (
        <div
          className="action-loading-cover"
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            width: "100vw",
            height: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: "1rem",
            backgroundColor: "rgba(255, 255, 255, 0.72)",
            padding: "1.5rem",
            textAlign: "center",
            backdropFilter: "blur(3px)",
          }}
        >
          <DailyHuntFlowerLoader className="h-14 w-14" />
          <span className="max-w-sm text-sm font-medium text-foreground">{message}</span>
        </div>
      )}
    </div>
  );
}
