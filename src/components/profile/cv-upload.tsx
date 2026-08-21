"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CvParsedProfile } from "@/lib/cv/types";

type ParseResult =
  | { ok: true; profile: CvParsedProfile }
  | { ok: false; error: string };

export function CvUpload({
  onParsed,
}: {
  onParsed: (profile: CvParsedProfile) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setFileName(file.name);
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/profile/parse-cv", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as ParseResult;
      if (!response.ok || !result.ok) {
        setError(result.ok ? "Something went wrong." : result.error);
        return;
      }
      onParsed(result.profile);
      router.refresh();
    } catch {
      setError("Upload failed — check your connection and retry.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-dashed p-5">
      <p className="text-sm font-medium">Import from your CV</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Upload a PDF or DOCX to pre-fill the fields below. Review before
        saving.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => {
            void handleFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {busy ? "Parsing…" : "Choose CV file"}
        </button>
        {fileName && !busy && (
          <span className="text-xs text-muted-foreground">{fileName}</span>
        )}
        {busy && (
          <span role="status" aria-live="polite" className="text-xs text-muted-foreground">
            Reading your CV and mapping it to the form…
          </span>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-status-rejected">
          {error}
        </p>
      )}
    </div>
  );
}