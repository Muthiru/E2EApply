"use client";

import { useRef, useState } from "react";

type ImportedCertificate = {
  name: string;
  issuer: string | null;
  date: string | null;
  url: string | null;
};

type ImportResult =
  | { ok: true; certificate: ImportedCertificate }
  | { ok: false; error: string };

export function CertificateImport({
  onImported,
}: {
  onImported: (certificate: ImportedCertificate) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/profile/certificates/import", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as ImportResult;
      if (!response.ok || !result.ok) {
        setError(result.ok ? "Something went wrong." : result.error);
        return;
      }
      onImported(result.certificate);
      if (inputRef.current) inputRef.current.value = "";
    } catch {
      setError("Upload failed — check your connection and retry.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="btn border border-dashed border-border bg-white/60 px-3 py-1.5 text-sm hover:border-primary hover:text-primary disabled:opacity-50"
      >
        {busy ? "Reading certificate…" : "Import from file"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
