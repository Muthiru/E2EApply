"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteApplication } from "@/lib/actions/job";
import { useToast } from "@/components/ui/toast";
import { DeleteConfirmationDialog } from "@/components/ui/DeleteConfirmationDialog";

export function DeleteApplicationButton({
  applicationId,
  label,
}: {
  applicationId: string;
  label: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const close = useCallback(() => setConfirming(false), []);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteApplication(applicationId);
      if (result.ok) {
        close();
        toast("Application deleted.");
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
        aria-label={`Delete ${label}`}
        title={`Delete ${label}`}
        className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:text-status-rejected"
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
        title="Delete this application?"
        description={label}
        isPending={isPending}
        onCancel={close}
        onConfirm={handleDelete}
      />
    </>
  );
}
