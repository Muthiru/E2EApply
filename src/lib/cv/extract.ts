import { extractText } from "unpdf";
import mammoth from "mammoth";

export type CvFileType = "pdf" | "docx";

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
    return Array.isArray(text) ? text.join("\n") : text;
  }

  const buffer = Buffer.from(data);
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}