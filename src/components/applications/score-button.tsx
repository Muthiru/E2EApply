"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { scoreApplication } from "@/lib/actions/job";

export function ScoreButton({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await scoreApplication(applicationId);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      {error && (
        <p role="alert" className="text-xs text-status-rejected">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {isPending ? "Scoring…" : "Score this job"}
      </button>
    </div>
  );
}