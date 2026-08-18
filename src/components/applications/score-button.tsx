"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { scoreApplication } from "@/lib/actions/job";
import { useToast } from "@/components/ui/toast";

export function ScoreButton({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      const result = await scoreApplication(applicationId);
      if (result.ok) {
        toast("Match score ready.");
        router.refresh();
      } else {
        toast(result.error, "error");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
    >
      {isPending ? "Scoring…" : "Score this job"}
    </button>
  );
}