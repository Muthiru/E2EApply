"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteDailyHuntBatch } from "@/lib/actions/daily-hunt";
import { DeleteConfirmationDialog } from "@/components/ui/DeleteConfirmationDialog";
import { useToast } from "@/components/ui/toast";

export function DeleteDailyHuntBatchButton({ batchId }: { batchId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const close = useCallback(() => setConfirming(false), []);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteDailyHuntBatch(batchId);
      if (result.ok) {
        close();
        toast("Daily Hunt batch deleted.");
        router.refresh();
      } else {
        toast(result.error, "error");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={isPending}
        aria-label="Delete batch"
        title="Delete batch"
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-status-rejected disabled:opacity-50"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
          aria-hidden="true"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>

      <DeleteConfirmationDialog
        open={confirming}
        title="Delete this batch?"
        description="This deletes the batch and its search results. Jobs already tracked in Applications will stay there."
        isPending={isPending}
        onCancel={close}
        onConfirm={handleDelete}
      />
    </>
  );
}
