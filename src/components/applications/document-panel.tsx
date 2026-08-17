"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  generateApplicationDocuments,
  saveFinalDocument,
} from "@/lib/actions/job";

type DocState = {
  text: string;
  version: number;
  isFinal: boolean;
};

export function DocumentPanel({
  applicationId,
  cv,
  coverLetter,
}: {
  applicationId: string;
  cv: DocState | null;
  coverLetter: DocState | null;
}) {
  const router = useRouter();
  const [generating, startGenerating] = useTransition();
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cvText, setCvText] = useState(cv?.text ?? "");
  const [clText, setClText] = useState(coverLetter?.text ?? "");

  const handleGenerate = () => {
    setError(null);
    startGenerating(async () => {
      const result = await generateApplicationDocuments(applicationId);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  const handleSaveFinal = (type: "CV" | "COVER_LETTER") => {
    setError(null);
    const content = type === "CV" ? cvText : clText;
    startSaving(async () => {
      const result = await saveFinalDocument(applicationId, type, content);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  const pdfHref = (type: "CV" | "COVER_LETTER") =>
    type === "CV"
      ? `/dashboard/applications/${applicationId}/cv.pdf`
      : `/dashboard/applications/${applicationId}/cover-letter.pdf`;

  return (
    <section className="rounded-lg border p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">Tailored documents</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            CV and cover letter written from your profile&apos;s facts, aligned
            to this posting&apos;s keywords. Review and edit before saving as
            final.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {generating ? "Generating…" : cv ? "Regenerate" : "Generate CV + cover letter"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-status-rejected">
          {error}
        </p>
      )}

      {(cv || coverLetter) && (
        <div className="mt-4 space-y-6">
          {cv && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">
                  CV draft{" "}
                  <span className="text-muted-foreground">
                    v{cv.version}{cv.isFinal ? " · final" : ""}
                  </span>
                </p>
                <div className="flex gap-2">
                  <a
                    href={pdfHref("CV")}
                    className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    Download PDF
                  </a>
                  <button
                    type="button"
                    onClick={() => handleSaveFinal("CV")}
                    disabled={saving}
                    className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save as final"}
                  </button>
                </div>
              </div>
              <textarea
                value={cvText}
                onChange={(e) => setCvText(e.target.value)}
                rows={16}
                className="mt-2 w-full rounded-md border px-3 py-2 font-mono text-xs leading-relaxed"
              />
            </div>
          )}

          {coverLetter && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">
                  Cover letter{" "}
                  <span className="text-muted-foreground">
                    v{coverLetter.version}
                    {coverLetter.isFinal ? " · final" : ""}
                  </span>
                </p>
                <div className="flex gap-2">
                  <a
                    href={pdfHref("COVER_LETTER")}
                    className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    Download PDF
                  </a>
                  <button
                    type="button"
                    onClick={() => handleSaveFinal("COVER_LETTER")}
                    disabled={saving}
                    className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save as final"}
                  </button>
                </div>
              </div>
              <textarea
                value={clText}
                onChange={(e) => setClText(e.target.value)}
                rows={10}
                className="mt-2 w-full rounded-md border px-3 py-2 font-mono text-xs leading-relaxed"
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}