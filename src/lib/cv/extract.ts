import { extractText } from "unpdf";
import mammoth from "mammoth";

export type CvFileType = "pdf" | "docx";

export function sanitizeExtractedCvText(text: string): string {
  // PostgreSQL text columns reject NUL bytes. Some PDF text extractors preserve
  // embedded NULs from the source file, so remove them before AI or DB use.
  return text.replace(/\u0000/g, " ");
}

export function detectCvType(
  name: string,
  mimeType: string | null,
): CvFileType | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf") || mimeType === "application/pdf") return "pdf";
  if (
    lower.endsWith(".docx") ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  return null;
}

export async function extractCvText(
  type: CvFileType,
  data: ArrayBuffer,
): Promise<string> {
  if (type === "pdf") {
    const { text } = await extractText(new Uint8Array(data));
    return sanitizeExtractedCvText(Array.isArray(text) ? text.join("\n") : text);
  }

  const buffer = Buffer.from(data);
  const result = await mammoth.extractRawText({ buffer });
  return sanitizeExtractedCvText(result.value);
}
