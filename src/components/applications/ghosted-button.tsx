"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateApplicationStatus } from "@/lib/actions/job";

export function GhostedButton({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleMark = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateApplicationStatus(
        applicationId,
        "GHOSTED",
        "No response in 14+ days — marked as likely ghosted.",
      );
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-0.5">
      {error && (
        <p role="alert" className="text-xs text-status-rejected">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={handleMark}
        disabled={isPending}
        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
      >
        {isPending ? "Marking…" : "Mark as ghosted"}
      </button>
    </div>
  );
}