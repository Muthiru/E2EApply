"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { DailyHuntFlowerLoader } from "@/components/daily-hunt/DailyHuntFlowerLoader";

type DailyHuntSubmitButtonProps = {
  idleLabel: string;
  pendingLabel: string;
  pendingMessage: string;
  className: string;
  children?: ReactNode;
  batchSearch?: boolean;
};

export function DailyHuntSubmitButton({
  idleLabel,
  pendingLabel,
  pendingMessage,
  className,
  children,
  batchSearch = false,
}: DailyHuntSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        className={className}
        type="submit"
        disabled={pending}
        aria-busy={pending}
        data-batch-search={batchSearch ? "true" : undefined}
      >
        {pending ? <DailyHuntFlowerLoader className="h-5 w-5" /> : children}
        {pending ? pendingLabel : idleLabel}
      </button>
      {pending && !batchSearch && (
        <span role="status" aria-live="polite" className="text-xs text-muted-foreground">
          {pendingMessage}
        </span>
      )}
    </div>
  );
}
