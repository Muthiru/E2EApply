"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  checkCvKeywordCoverage,
  generateApplicationDocuments,
  saveFinalDocument,
  setApplicationClTemplate,
  setApplicationCvTemplate,
} from "@/lib/actions/job";
import { CV_TEMPLATES, CL_TEMPLATES, type CvTemplateId } from "@/lib/job/templates";
import type { CvAlignmentCheck } from "@/lib/job/cvAlignment";
import { matchBadgeClass } from "@/lib/status";
import {
  cvBulletContent,
  extractMasterCvContactBlock,
  isCvBulletLine,
  linkHref,
  stripMasterCvContactBlock,
} from "@/lib/job/documents";
import { useToast } from "@/components/ui/toast";
import { isClTemplateId, isCvTemplateId } from "@/lib/job/templates";

type DocState = {
  text: string;
  version: number;
  isFinal: boolean;
  alignment?: CvAlignmentCheck | null;
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

function CvPreview({
  text,
  header,
  template,
  contactBlockText,
}: Readonly<{
  text: string;
  header: CvHeader;
  template: CvTemplateId;
  contactBlockText: string | null;
}>) {
  const modern = template === "modern";
  const compact = template === "compact";
  let paddingClass = "p-10 sm:p-12";
  if (compact) paddingClass = "p-8 sm:p-10";
  else if (modern) paddingClass = "";

  const pageClass = [
    "mx-auto min-h-[760px] w-full max-w-[760px] bg-white text-neutral-950",
    "shadow-sm ring-1 ring-border",
    paddingClass,
  ].join(" ");

  const contactLines = contactBlockText
    ? contactBlockText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    : [
      header.fullName,
      header.title,
      header.location,
      header.email,
      header.phone,
      header.github,
      header.linkedin,
    ].filter((line): line is string => Boolean(line));
  const [nameLine, ...detailLines] = contactLines;

  let bodyText = text;
  let tailoredTitle: string | null = null;
  const splitBody = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (splitBody.length > 0 && !splitBody[0].startsWith("##") && !splitBody[0].toLowerCase().includes("summary")) {
    tailoredTitle = splitBody[0].replace(/^#+\s*/, "");
    bodyText = splitBody.slice(1).join("\n");
  }

  const finalDetailLines = [...detailLines];
  if (tailoredTitle) {
    const titleObjIndex = finalDetailLines.findIndex(l => !l.includes("@") && !l.includes("github.com") && !l.includes("linkedin.com") && !/\+?\d{8,}/.test(l));
    if (titleObjIndex !== -1) {
      finalDetailLines[titleObjIndex] = tailoredTitle;
    } else {
      finalDetailLines.unshift(tailoredTitle);
    }
  }

  const contact = (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-600">
      {finalDetailLines.map((line, idx) => {
        const lineKey = `det-${idx}`;
        const href = linkHref(line);
        return href ? (
          <a key={lineKey} href={href} className="text-blue-700 underline underline-offset-2">
            {line}
          </a>
        ) : (
          <span key={lineKey}>{line}</span>
        );
      })}
    </div>
  );

  let headingClass = "border-b border-neutral-300 pb-1 pt-5 text-xs font-bold uppercase first:pt-0";
  if (modern) {
    headingClass = "border-b border-blue-200 pb-1 pt-5 text-xs font-bold uppercase text-blue-700 first:pt-0";
  } else if (compact) {
    headingClass = "border-b border-neutral-300 pb-1 pt-3 text-[11px] font-bold uppercase first:pt-0";
  }

  const bodyClass = compact
    ? "text-[11px] leading-[1.55]"
    : "text-[12px] leading-[1.65]";
  const bodySpace = compact ? "space-y-1.5" : "space-y-2";

  const body = (
    <div className={`mt-6 ${bodySpace}`}>
      {bodyText.split(/\r?\n/).map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        const lineKey = `bl-${idx}`;
        const heading = /^##\s+(.*)/.exec(trimmed);
        if (heading) {
          return (
            <p key={lineKey} className={headingClass}>
              {heading[1]}
            </p>
          );
        }
        const bulletContent = cvBulletContent(trimmed);
        const content = bulletContent ?? trimmed;
        const href = linkHref(content);
        if (href) {
          return (
            <p key={lineKey} className={bodyClass}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 underline underline-offset-2 hover:text-foreground"
              >
                {content}
              </a>
            </p>
          );
        }
        if (isCvBulletLine(trimmed)) {
          return (
            <p key={lineKey} className={`flex gap-2 ${bodyClass}`}>
              <span aria-hidden="true" className="mt-[0.15rem] text-blue-700">
                •
              </span>
              <span>{content}</span>
            </p>
          );
        }
        return (
          <p key={lineKey} className={bodyClass}>
            {content}
          </p>
        );
      })}
    </div>
  );

  if (modern) {
    return (
      <div className={`${pageClass} p-10 sm:p-12`}>
        <div className="border-b-2 border-blue-600 pb-4">
          {nameLine && (
            <p className="text-2xl font-bold uppercase text-neutral-950">
              {nameLine}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-600">
            {finalDetailLines.map((line, idx) => {
              const lineKey = `det2-${idx}`;
              const href = linkHref(line);
              return href ? (
                <a key={lineKey} href={href} className="text-blue-700 underline underline-offset-2">
                  {line}
                </a>
              ) : (
                <span key={lineKey}>{line}</span>
              );
            })}
          </div>
        </div>
        {body}
      </div>
    );
  }

  return (
    <div className={pageClass}>
      {nameLine && (
        <p className={compact ? "text-xl font-bold uppercase" : "text-2xl font-bold uppercase"}>
          {nameLine}
        </p>
      )}
      {finalDetailLines.length > 0 && contact}
      {body}
    </div>
  );
}

function LetterPreview({
  text,
  template,
}: Readonly<{
  text: string;
  template: "classic" | "modern" | "compact";
}>) {
  const modern = template === "modern";
  const compact = template === "compact";
  const pageClass = [
    "mx-auto min-h-[760px] w-full max-w-[760px] bg-white text-neutral-950",
    "shadow-sm ring-1 ring-border",
    compact ? "p-8 sm:p-10" : "p-10 sm:p-12",
    modern ? "border-t-4 border-blue-600" : "",
  ].join(" ");

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, idx) => {
      const pKey = `lp-${idx}`;
      return (
        <p key={pKey} className={compact ? "text-[11px] leading-[1.6]" : "text-[12px] leading-[1.75]"}>
          {paragraph}
        </p>
      );
    });

  return (
    <div className={pageClass}>
      <div className={compact ? "space-y-3" : "space-y-4"}>{paragraphs}</div>
    </div>
  );
}

function MiniDocumentPreview({
  id,
  kind,
  text,
  header,
  contactBlockText,
}: Readonly<{
  id: string;
  kind: "cv" | "letter";
  text: string;
  header: CvHeader;
  contactBlockText: string | null;
}>) {
  const modern = id === "modern";
  const compact = id === "compact";
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, kind === "cv" ? 12 : 9);
  const hasContent = lines.length > 0;
  const contactLines = contactBlockText
    ? contactBlockText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    : [
      header.fullName,
      header.title,
      header.location,
      header.email,
    ].filter((line): line is string => Boolean(line));
  const [nameLine, ...detailLines] = contactLines;

  return (
    <div className="h-full overflow-hidden bg-white p-3 text-neutral-950">
      {modern ? (
        <div className="mb-3 border-b-2 border-blue-600 pb-2">
          <p className="truncate text-[7px] font-bold uppercase leading-tight text-neutral-950">
            {nameLine ?? (kind === "cv" ? "CV" : "Cover letter")}
          </p>
          <p className="mt-0.5 truncate text-[5px] leading-tight text-neutral-500">
            {detailLines.slice(0, 2).join(" | ")}
          </p>
        </div>
      ) : (
        <div className="mb-3">
          <p className="truncate text-[7px] font-bold uppercase leading-tight">
            {nameLine ?? (kind === "cv" ? "CV" : "Cover letter")}
          </p>
          <p className="mt-0.5 truncate text-[5px] leading-tight text-neutral-500">
            {detailLines.slice(0, 2).join(" | ")}
          </p>
        </div>
      )}
      {hasContent ? (
        <div className={compact ? "space-y-1" : "space-y-1.5"}>
          {lines.map((line, index) => {
            const lineKey = `line-${index}`;
            const heading = /^##\s+(.*)/.exec(line);
            const bullet = isCvBulletLine(line);
            const bulletText = cvBulletContent(line);

            let lineClass = "text-[5.5px] leading-tight text-neutral-700";
            if (heading) {
              lineClass = "border-b border-blue-200 pb-0.5 text-[6px] font-bold uppercase text-blue-700";
            } else if (bullet) {
              lineClass = "pl-1 text-[5.5px] leading-tight text-neutral-700";
            }

            return (
              <p
                key={lineKey}
                className={`truncate ${lineClass}`}
              >
                {bullet ? (bulletText ?? line) : heading?.[1] ?? line}
              </p>
            );
          })}
        </div>
      ) : (
        <p className="text-[6px] leading-tight text-neutral-500">
          Generate this document to preview its actual content.
        </p>
      )}
    </div>
  );
}

function TemplatePicker({
  label,
  templates,
  value,
  onChange,
  disabled,
  kind,
  text,
  header,
  contactBlockText,
}: Readonly<{
  label: string;
  templates: { id: string; label: string; description: string }[];
  value: string;
  onChange: (id: string) => void;
  disabled: boolean;
  kind: "cv" | "letter";
  text: string;
  header: CvHeader;
  contactBlockText: string | null;
}>) {
  return (
    <div className="w-full">
      <p className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {templates.map((template) => {
          const selected = value === template.id;
          return (
            <button
              key={template.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(template.id)}
              disabled={disabled}
              title={template.description}
              className={`rounded-md border text-left disabled:opacity-50 ${selected
                ? "border-foreground ring-1 ring-foreground"
                : "hover:border-foreground/50"
                }`}
            >
              <div className="pointer-events-none m-2 aspect-[1/1.414] overflow-hidden rounded-sm border bg-neutral-50">
                <MiniDocumentPreview
                  id={template.id}
                  kind={kind}
                  text={text}
                  header={header}
                  contactBlockText={contactBlockText}
                />
              </div>
              <div className="px-2 pb-2">
                <p
                  className={`text-xs font-medium ${selected ? "text-foreground" : "text-muted-foreground"
                    }`}
                >
                  {template.label}
                </p>
                <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                  {template.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type DocumentPanelProps = {
  applicationId: string;
  cv: DocState | null;
  coverLetter: DocState | null;
  header: CvHeader;
  cvTemplate: string;
  clTemplate: string;
  masterCvText: string | null;
};

function AlignmentBlock({ alignment }: Readonly<{ alignment: CvAlignmentCheck | null }>) {
  if (!alignment) return null;
  return (
    <div className="mt-3 rounded-md border p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">ATS keyword coverage</p>
        <span
          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${matchBadgeClass(alignment.score)}`}
        >
          {alignment.score}%
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        How many of the posting&apos;s requirement keywords actually appear in this CV.
      </p>
      <p className="mt-2 text-xs leading-relaxed">{alignment.reasoning}</p>
      <div className="mt-2 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {alignment.covered.map((keyword) => (
            <span
              key={keyword}
              className="rounded-full border border-status-offer/40 px-2 py-0.5 text-xs text-status-offer"
            >
              {keyword}
            </span>
          ))}
        </div>
        {alignment.missingOwnable.length > 0 && (
          <p className="text-xs text-status-assessment">
            In your profile but missing from the CV — worth re-adding:
            {alignment.missingOwnable.join(", ")}
          </p>
        )}
        {alignment.missingGaps.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Not in your profile (honest gaps): {alignment.missingGaps.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}

export function DocumentPanel(props: Readonly<DocumentPanelProps>) {
  const panelKey = [
    props.applicationId,
    props.cv?.version ?? "no-cv",
    props.cv?.isFinal ? "cv-final" : "cv-draft",
    props.cv?.alignment?.score ?? "no-alignment",
    props.masterCvText ? "has-master-cv" : "no-master-cv",
    props.coverLetter?.version ?? "no-cl",
    props.coverLetter?.isFinal ? "cl-final" : "cl-draft",
    props.cvTemplate,
    props.clTemplate,
  ].join(":");

  return <DocumentPanelInner key={panelKey} {...props} />;
}

function DocumentPanelInner({
  applicationId,
  cv,
  coverLetter,
  header,
  cvTemplate,
  clTemplate,
  masterCvText,
}: Readonly<DocumentPanelProps>) {
  const router = useRouter();
  const { toast } = useToast();
  const [generating, startGenerating] = useTransition();
  const [saving, startSaving] = useTransition();
  const [checking, startChecking] = useTransition();
  const [editing, setEditing] = useState<"CV" | "COVER_LETTER" | null>(null);
  const masterCvContactBlock = extractMasterCvContactBlock(masterCvText);
  const masterCvPreviewText = masterCvText
    ? stripMasterCvContactBlock(masterCvText, masterCvContactBlock)
    : "";
  const cvPreviewText = cv?.text ?? masterCvPreviewText;
  const hasCvPreview = cvPreviewText.trim().length > 0;
  const [cvText, setCvText] = useState(cvPreviewText);
  const [clText, setClText] = useState(coverLetter?.text ?? "");
  const [alignment, setAlignment] = useState<CvAlignmentCheck | null>(
    cv?.alignment ?? null,
  );

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

  const handleTemplateChange = (templateId: string) => {
    startSaving(async () => {
      const result = await setApplicationCvTemplate(applicationId, templateId);
      if (result.ok) {
        toast("CV template updated.");
        router.refresh();
      } else {
        toast(result.error, "error");
      }
    });
  };

  const handleClTemplateChange = (templateId: string) => {
    startSaving(async () => {
      const result = await setApplicationClTemplate(applicationId, templateId);
      if (result.ok) {
        toast("Cover letter template updated.");
        router.refresh();
      } else {
        toast(result.error, "error");
      }
    });
  };

  const handleCheckAlignment = () => {
    startChecking(async () => {
      const result = await checkCvKeywordCoverage(applicationId);
      if (result.ok) {
        setAlignment(result.result);
        toast(`Keyword coverage: ${result.result.score}%`);
      } else {
        toast(result.error, "error");
      }
    });
  };

  const pdfHref = (type: "CV" | "COVER_LETTER") => {
    const version = type === "CV" ? cv?.version : coverLetter?.version;
    const base = type === "CV"
      ? `/dashboard/applications/${applicationId}/cv.pdf`
      : `/dashboard/applications/${applicationId}/cover-letter.pdf`;
    return `${base}?v=${version || 0}`;
  };

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
        href={pdfHref(type) + "&format=docx"}
        className="rounded-md border px-3 py-1.5 text-sm hover:border-foreground/50 hover:text-foreground"
      >
        Download DOCX
      </a>
      <a
        href={pdfHref(type)}
        className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90"
      >
        Download PDF
      </a>
    </div>
  );

  const alignmentBlock = <AlignmentBlock alignment={alignment} />;

  let generateText = "Generate CV + cover letter";
  if (generating) generateText = "Generating…";
  else if (cv) generateText = "Regenerate";

  let checkCoverageBtnText = "Check keyword coverage";
  if (checking) {
    checkCoverageBtnText = "Checking…";
  } else if (alignment) {
    checkCoverageBtnText = "Re-check coverage";
  }

  let cvStatusBlock = <span className="text-status-rejected">missing</span>;
  if (cv) {
    cvStatusBlock = (
      <span className="text-muted-foreground">
        v{cv.version}{cv.isFinal ? " · final" : " · draft"}
      </span>
    );
  } else if (hasCvPreview) {
    cvStatusBlock = (
      <span className="text-muted-foreground">
        master CV from profile
      </span>
    );
  }

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
          {generateText}
        </button>
      </div>

      {(cv || coverLetter || hasCvPreview) && (
        <div className="mt-4 space-y-8">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">
                CV{" "}
                {cvStatusBlock}
                {alignment && (
                  <span
                    className={`ml-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${matchBadgeClass(alignment.score)}`}
                  >
                    keyword score {alignment.score}%
                  </span>
                )}
              </p>
              {cv && actionButtons("CV")}
            </div>
            <div className="mt-3">
              <TemplatePicker
                label="CV template"
                templates={CV_TEMPLATES}
                value={cvTemplate}
                onChange={handleTemplateChange}
                disabled={saving}
                kind="cv"
                text={cvText}
                header={header}
                contactBlockText={masterCvContactBlock}
              />
            </div>

            {!hasCvPreview && (
              <div className="mt-3 rounded-md border border-status-rejected/30 bg-status-rejected/5 p-4 text-sm text-status-rejected">
                No CV was saved for this application, and no imported master CV
                was found on your profile. Upload a master CV or regenerate the
                documents to create both the tailored CV and cover letter.
              </div>
            )}

            {hasCvPreview && editing === "CV" && (
              <div className="mt-2">
                <div className="mb-2 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground border border-dashed">
                  <p className="font-semibold text-foreground mb-1">Header is auto-injected from your profile</p>
                  <p>Your name, email, phone, and links are automatically placed at the top of the PDF. You only need to edit the CV body below.</p>
                </div>
                <textarea
                  value={cvText}
                  onChange={(e) => setCvText(e.target.value)}
                  rows={18}
                  className="w-full rounded-md border px-3 py-2 font-mono text-xs leading-relaxed"
                />
              </div>
            )}

            {hasCvPreview && editing !== "CV" && (
              <div className="mt-2">
                <CvPreview
                  text={cvText}
                  header={header}
                  template={isCvTemplateId(cvTemplate) ? cvTemplate : "classic"}
                  contactBlockText={masterCvContactBlock}
                />
                {!cv && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Showing the imported master CV from your profile. Generate
                    documents to create a tailored CV for this application.
                  </p>
                )}
                {alignmentBlock}
                {cv && (
                  <button
                    type="button"
                    onClick={handleCheckAlignment}
                    disabled={checking}
                    className="mt-3 rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    {checkCoverageBtnText}
                  </button>
                )}
              </div>
            )}
          </div>

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
              <div className="mt-3">
                <TemplatePicker
                  label="Cover letter template"
                  templates={CL_TEMPLATES}
                  value={clTemplate}
                  onChange={handleClTemplateChange}
                  disabled={saving}
                  kind="letter"
                  text={clText}
                  header={header}
                  contactBlockText={masterCvContactBlock}
                />
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
                  <LetterPreview
                    text={clText}
                    template={isClTemplateId(clTemplate) ? clTemplate : "classic"}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
