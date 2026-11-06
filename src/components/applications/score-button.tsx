"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { scoreApplication, setApplicationMasterCv } from "@/lib/actions/job";
import { useScoreLoading } from "@/components/applications/ScoreLoadingBoundary";
import { useToast } from "@/components/ui/toast";

export function ScoreButton(props: Readonly<{
  applicationId: string;
  masterCvs?: { id: string; name: string }[];
  selectedCvId?: string | null;
  hasScore?: boolean;
}>) {
  const { applicationId, masterCvs = [], selectedCvId = null, hasScore = false } = props;
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const setBoundaryLoading = useScoreLoading();

  useEffect(() => {
    if (!isPending) setBoundaryLoading?.(false, "");
  }, [isPending, setBoundaryLoading]);

  const handleScore = () => {
    setBoundaryLoading?.(true, "Scoring this job against your selected Master CV…");
    startTransition(async () => {
      try {
        const result = await scoreApplication(applicationId);
        if (result.ok) {
          toast("Match score ready.");
          router.refresh();
        } else {
          toast(result.error, "error");
        }
      } catch (error) {
        toast(error instanceof Error ? error.message : "Could not score this job.", "error");
      }
    });
  };

  const handleSelectCv = (cvId: string) => {
    const nextId = cvId === "none" ? null : cvId;
    setBoundaryLoading?.(true, "Updating the selected Master CV…");
    startTransition(async () => {
      try {
        const result = await setApplicationMasterCv(applicationId, nextId);
        if (result.ok) {
          toast("Master CV selected. Click Rescore to update.");
          router.refresh();
        } else {
          toast(result.error, "error");
        }
      } catch (error) {
        toast(error instanceof Error ? error.message : "Could not update the selected CV.", "error");
      }
    });
  };

  let buttonText = "Score this job";
  if (isPending) {
    buttonText = "Generating…";
  } else if (masterCvs.length === 0) {
    buttonText = "Upload a Master CV first";
  } else if (masterCvs.length > 0 && !selectedCvId) {
    buttonText = "Select a Master CV";
  } else if (hasScore) {
    buttonText = "Rescore";
  }

  return (
    <div className="flex w-full max-w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      {masterCvs.length > 0 && (
        <select
          disabled={isPending}
          value={selectedCvId ?? "none"}
          onChange={(e) => handleSelectCv(e.target.value)}
          className="field-control min-w-0 flex-1 sm:w-56"
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
        disabled={isPending || masterCvs.length === 0 || !selectedCvId}
        className="btn btn-primary min-w-0 flex-1 sm:flex-none"
      >
        {buttonText}
      </button>
    </div>
  );
}
