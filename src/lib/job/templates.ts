export type CvTemplateId = "classic" | "modern" | "compact";
export type ClTemplateId = "classic" | "modern" | "compact";

export const DEFAULT_CV_TEMPLATE: CvTemplateId = "classic";
export const DEFAULT_CL_TEMPLATE: ClTemplateId = "classic";

export const CV_TEMPLATES: { id: CvTemplateId; label: string; description: string }[] = [
  {
    id: "classic",
    label: "24B Classic",
    description: "Clean single-column ATS resume.",
  },
  {
    id: "modern",
    label: "Europass Clean",
    description: "Structured European CV layout with blue section accents.",
  },
  {
    id: "compact",
    label: "24B Compact",
    description: "Dense ATS resume for longer histories.",
  },
];

export const CL_TEMPLATES: { id: ClTemplateId; label: string; description: string }[] = [
  {
    id: "classic",
    label: "24B Classic",
    description: "Plain professional letter layout.",
  },
  {
    id: "modern",
    label: "Europass Clean",
    description: "Formal European letter layout with a blue top rule.",
  },
  {
    id: "compact",
    label: "24B Compact",
    description: "Compact block letter layout.",
  },
];

export function isCvTemplateId(value: unknown): value is CvTemplateId {
  return (
    typeof value === "string" &&
    CV_TEMPLATES.some((template) => template.id === value)
  );
}

export function isClTemplateId(value: unknown): value is ClTemplateId {
  return (
    typeof value === "string" &&
    CL_TEMPLATES.some((template) => template.id === value)
  );
}
