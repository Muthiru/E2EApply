"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateApplicationStatus } from "@/lib/actions/job";
import { useToast } from "@/components/ui/toast";

export function GhostedButton({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleMark = () => {
    startTransition(async () => {
      const result = await updateApplicationStatus(
        applicationId,
        "GHOSTED",
        "No response in 14+ days — marked as likely ghosted.",
      );
      if (result.ok) {
        toast("Marked as likely ghosted.");
        router.refresh();
      } else {
        toast(result.error, "error");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleMark}
      disabled={isPending}
      className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
    >
      {isPending ? "Marking…" : "Mark as ghosted"}
    </button>
  );
}