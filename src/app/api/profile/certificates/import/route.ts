import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAiProvider, type AiMessage } from "@/lib/ai";
import { detectCvType, extractCvText } from "@/lib/cv/extract";
import { extractJson } from "@/lib/cv/sanitize";
import { renderPageAsImage } from "unpdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const SCHEMA_DESCRIPTION = `The document is a certificate or certification document. Respond with a single JSON object using ONLY these fields:
{
  "name": string,
  "issuer": string | null,
  "date": "YYYY-MM-DD" | null,
  "url": string | null
}`;

const RULES = `Rules:
- name: the certificate title (e.g. "AWS Certified Solutions Architect – Associate"). If no certificate name is found, return an empty string.
- issuer: the organization that issued it (e.g. "Amazon Web Services", "Coursera"). null if unknown.
- date: issue date as "YYYY-MM-DD". If only a year is given, use "YYYY-01-01". If missing or unclear, null.
- url: a verification URL shown in the document (e.g. credly.com, coursera.org, udemy.com links). null if none.
- Extract facts ONLY from the document. Never invent, guess, or embellish.
- Output valid JSON only — no markdown, no commentary.`;

type ParsedCertificate = {
  name: string;
  issuer: string | null;
  date: string | null;
  url: string | null;
};

function sanitizeParsed(parsed: Record<string, unknown>): ParsedCertificate | null {
  const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
  if (!name) return null;

  const asString = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v.trim() : null;

  const rawDate = asString(parsed.date);
  const date = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : null;

  return {
    name,
    issuer: asString(parsed.issuer),
    date,
    url: asString(parsed.url),
  };
}

async function parseWithAi(
  messages: AiMessage[],
): Promise<ParsedCertificate | null> {
  const ai = getAiProvider();
  const raw = await ai.complete(
    [
      {
        role: "system",
        content: `${SCHEMA_DESCRIPTION}\n\n${RULES}`,
      },
      ...messages,
    ],
    { jsonMode: true, temperature: 0.1 },
  );

  const parsed = extractJson(raw) as Record<string, unknown> | null;
  if (parsed === null || typeof parsed !== "object") {
    console.error("[certificates-import] malformed AI JSON:", raw.slice(0, 500));
    return null;
  }
  return sanitizeParsed(parsed);
}

async function renderPdfAsPng(data: ArrayBuffer): Promise<string | null> {
  try {
    const dataUrl = await renderPageAsImage(new Uint8Array(data), 1, {
      canvasImport: () => import("@napi-rs/canvas"),
      scale: 2,
      toDataURL: true,
    });
    if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/png;")) {
      return null;
    }
    return dataUrl.slice("data:image/png;base64,".length);
  } catch (error) {
    console.error("[certificates-import] PDF render failed:", error);
    return null;
  }
}

export async function POST(request: Request) {
  await auth.protect();

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "No file provided." },
      { status: 400 },
    );
  }

  if (file.size === 0 || file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { ok: false, error: "File must be between 1 byte and 5 MB." },
      { status: 400 },
    );
  }

  const type = detectCvType(file.name, file.type);
  if (!type) {
    return NextResponse.json(
      { ok: false, error: "Only .pdf and .docx certificates are supported." },
      { status: 400 },
    );
  }

  const text = await extractCvText(type, await file.arrayBuffer());
  let certificate: ParsedCertificate | null = null;

  if (text.trim()) {
    certificate = await parseWithAi([
      { role: "user", content: `Document text:\n${text.slice(0, 40_000)}` },
    ]);
  }

  if (!certificate && type === "pdf") {
    const png = await renderPdfAsPng(await file.arrayBuffer());
    if (png) {
      certificate = await parseWithAi([
        {
          role: "user",
          content: `This image is the certificate document. Read the certificate details from the image.`,
          image: { mimeType: "image/png", dataBase64: png },
        },
      ]);
    }
  }

  if (!certificate) {
    return NextResponse.json(
      {
        ok: false,
        error: "No certificate name found in this document — try a different file.",
      },
      { status: 422 },
    );
  }

  return NextResponse.json({ ok: true, certificate });
}