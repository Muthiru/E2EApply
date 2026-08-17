"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  generateApplicationDocuments,
  saveFinalDocument,
} from "@/lib/actions/job";
import { linkHref } from "@/lib/job/documents";
import { useToast } from "@/components/ui/toast";

type DocState = {
  text: string;
  version: number;
  isFinal: boolean;
};

export type CvHeader = {
  fullName: string | null;
  title: string | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  github: string | null;
  linkedin: string | null;
};

function CvPreview({ text, header }: { text: string; header: CvHeader }) {
  const contactParts = [
    { value: header.title, href: null },
    { value: header.location, href: null },
    { value: header.email, href: header.email ? `mailto:${header.email}` : null },
    { value: header.phone, href: null },
    { value: header.github, href: header.github ? linkHref(header.github) : null },
    { value: header.linkedin, href: header.linkedin ? linkHref(header.linkedin) : null },
  ].filter((part): part is { value: string; href: string | null } => Boolean(part.value));

  return (
    <div className="rounded-md border bg-background p-6">
      {header.fullName && (
        <p className="text-xl font-bold tracking-tight">{header.fullName}</p>
      )}
      {contactParts.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
          {contactParts.map((part, i) =>
            part.href ? (
              <a key={i} href={part.href} className="text-status-assessment underline underline-offset-2 hover:text-foreground">
                {part.value}
              </a>
            ) : (
              <span key={i}>{part.value}</span>
            ),
          )}
        </div>
      )}
      <div className="mt-4 space-y-2.5">
        {text.split(/\r?\n/).map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return null;
          const heading = /^##\s+(.+)$/.exec(trimmed);
          if (heading) {
            return (
              <p
                key={i}
                className="border-b border-muted pb-1 pt-3 text-sm font-semibold first:pt-0"
              >
                {heading[1]}
              </p>
            );
          }
          const href = linkHref(trimmed);
          const content = trimmed.startsWith("- ") ? trimmed.slice(2) : trimmed;
          if (href) {
            return (
              <p key={i} className="text-sm leading-relaxed">
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-status-assessment underline underline-offset-2 hover:text-foreground"
                >
                  {content}
                </a>
              </p>
            );
          }
          if (trimmed.startsWith("- ")) {
            return (
              <p key={i} className="flex gap-2 text-sm leading-relaxed">
                <span aria-hidden="true">•</span>
                <span>{content}</span>
              </p>
            );
          }
          return (
            <p key={i} className="text-sm leading-relaxed">
              {content}
            </p>
          );
        })}
      </div>
    </div>
  );
}

function LetterPreview({ text }: { text: string }) {
  return (
    <div className="rounded-md border bg-background p-6">
      <div className="space-y-3">
        {text
          .split(/\n\s*\n/)
          .map((paragraph) => paragraph.trim())
          .filter(Boolean)
          .map((paragraph, i) => (
            <p key={i} className="text-sm leading-relaxed">
              {paragraph}
            </p>
          ))}
      </div>
    </div>
  );
}

export function DocumentPanel({
  applicationId,
  cv,
  coverLetter,
  header,
}: {
  applicationId: string;
  cv: DocState | null;
  coverLetter: DocState | null;
  header: CvHeader;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [generating, startGenerating] = useTransition();
  const [saving, startSaving] = useTransition();
  const [editing, setEditing] = useState<"CV" | "COVER_LETTER" | null>(null);
  const [cvText, setCvText] = useState(cv?.text ?? "");
  const [clText, setClText] = useState(coverLetter?.text ?? "");

  useEffect(() => {
    setCvText(cv?.text ?? "");
    setClText(coverLetter?.text ?? "");
  }, [cv?.text, coverLetter?.text]);

  const handleGenerate = () => {
    startGenerating(async () => {
      const result = await generateApplicationDocuments(applicationId);
      if (result.ok) {
        toast(cv ? "Documents regenerated." : "CV and cover letter generated.");
        router.refresh();
      } else {
        toast(result.error, "error");
      }
    });
  };

  const handleSaveFinal = (type: "CV" | "COVER_LETTER") => {
    const content = type === "CV" ? cvText : clText;
    startSaving(async () => {
      const result = await saveFinalDocument(applicationId, type, content);
      if (result.ok) {
        toast("Saved as final.");
        router.refresh();
      } else {
        toast(result.error, "error");
      }
    });
  };

  const pdfHref = (type: "CV" | "COVER_LETTER") =>
    type === "CV"
      ? `/dashboard/applications/${applicationId}/cv.pdf`
      : `/dashboard/applications/${applicationId}/cover-letter.pdf`;

  const actionButtons = (type: "CV" | "COVER_LETTER") => (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() =>
          setEditing((current) => (current === type ? null : type))
        }
        className="rounded-md border px-3 py-1.5 text-sm hover:border-foreground/50 hover:text-foreground"
      >
        {editing === type ? "Done editing" : "Edit"}
      </button>
      <button
        type="button"
        onClick={() => handleSaveFinal(type)}
        disabled={saving}
        className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save as final"}
      </button>
      <a
        href={pdfHref(type)}
        className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90"
      >
        Download PDF
      </a>
    </div>
  );

  return (
    <section className="rounded-lg border p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">Tailored documents</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Preview the generated CV and cover letter, edit them, and download
            the final PDF.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {generating
            ? "Generating…"
            : cv
              ? "Regenerate"
              : "Generate CV + cover letter"}
        </button>
      </div>

      {(cv || coverLetter) && (
        <div className="mt-4 space-y-8">
          {cv && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">
                  CV{" "}
                  <span className="text-muted-foreground">
                    v{cv.version}{cv.isFinal ? " · final" : " · draft"}
                  </span>
                </p>
                {actionButtons("CV")}
              </div>
              {editing === "CV" ? (
                <textarea
                  value={cvText}
                  onChange={(e) => setCvText(e.target.value)}
                  rows={18}
                  className="mt-2 w-full rounded-md border px-3 py-2 font-mono text-xs leading-relaxed"
                />
              ) : (
                <div className="mt-2">
                  <CvPreview text={cvText} header={header} />
                </div>
              )}
            </div>
          )}

          {coverLetter && (
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">
                  Cover letter{" "}
                  <span className="text-muted-foreground">
                    v{coverLetter.version}
                    {coverLetter.isFinal ? " · final" : " · draft"}
                  </span>
                </p>
                {actionButtons("COVER_LETTER")}
              </div>
              {editing === "COVER_LETTER" ? (
                <textarea
                  value={clText}
                  onChange={(e) => setClText(e.target.value)}
                  rows={14}
                  className="mt-2 w-full rounded-md border px-3 py-2 font-mono text-xs leading-relaxed"
                />
              ) : (
                <div className="mt-2">
                  <LetterPreview text={clText} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}