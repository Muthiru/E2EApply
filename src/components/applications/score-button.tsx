"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { scoreApplication, setApplicationMasterCv } from "@/lib/actions/job";
import { useToast } from "@/components/ui/toast";

export function ScoreButton({
  applicationId,
  masterCvs = [],
  selectedCvId = null,
  hasScore = false
}: {
  applicationId: string;
  masterCvs?: { id: string; name: string }[];
  selectedCvId?: string | null;
  hasScore?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleScore = () => {
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

  const handleSelectCv = (cvId: string) => {
    const nextId = cvId === "none" ? null : cvId;
    startTransition(async () => {
      const result = await setApplicationMasterCv(applicationId, nextId);
      if (result.ok) {
        toast("Master CV selected. Click Rescore to update.");
        router.refresh();
      } else {
        toast(result.error, "error");
      }
    });
  };

  return (
    <div className="flex items-center gap-3">
      {masterCvs.length > 0 && (
        <select
          disabled={isPending}
          value={selectedCvId ?? "none"}
          onChange={(e) => handleSelectCv(e.target.value)}
          className="rounded-md border bg-transparent px-3 py-1.5 text-sm"
        >
          <option value="none">No tailored CV selected</option>
          {masterCvs.map(cv => (
            <option key={cv.id} value={cv.id}>{cv.name}</option>
          ))}
        </select>
      )}
      <button
        type="button"
        onClick={handleScore}
        disabled={isPending}
        className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {isPending ? "Generating…" : hasScore ? "Rescore" : "Score this job"}
      </button>
    </div>
  );
}