import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAiProvider } from "@/lib/ai";
import { detectCvType, extractCvText } from "@/lib/cv/extract";
import { sanitizeParsedProfile, extractJson, enrichFromText } from "@/lib/cv/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const SCHEMA_DESCRIPTION = `Respond with a single JSON object using ONLY these fields:
{
  "fullName": string | null,
  "title": string | null,
  "summary": string | null,
  "location": string | null,
  "phone": string | null,
  "email": string | null,
  "website": string | null,
  "github": string | null,
  "linkedin": string | null,
  "skills": [{ "name": string, "level": string | null, "years": number | null }],
  "experiences": [{
    "company": string, "title": string, "location": string | null,
    "startDate": "YYYY-MM-DD" | null, "endDate": "YYYY-MM-DD" | null,
    "current": boolean, "description": string | null, "highlights": string[]
  }],
  "educations": [{
    "institution": string, "degree": string | null, "field": string | null,
    "startDate": "YYYY-MM-DD" | null, "endDate": "YYYY-MM-DD" | null, "gpa": string | null
  }],
  "projects": [{
    "name": string, "description": string | null, "url": string | null,
    "technologies": string[], "startDate": "YYYY-MM-DD" | null, "endDate": "YYYY-MM-DD" | null
  }],
  "certifications": [{ "name": string, "issuer": string | null, "date": "YYYY-MM-DD" | null, "url": string | null }]
}`;

const RULES = `Rules:
- Extract facts ONLY from the CV text. Never invent, guess, or embellish.
- Dates: "YYYY-MM-DD". "Present" / "Current" means current:true and endDate:null.
- If only a year is given, use "YYYY-01-01". If a date is missing or unclear, use null.
- skills: each name unique, lowercase-normalized deduplication, years = 0 if unknown.
- experiences/projects/certifications: omit the item entirely if its name/company is missing.
- Sections absent from the CV become empty arrays. Keep every field key present in the object.
- Include LinkedIn, GitHub, and personal website URLs verbatim when present.
- Output valid JSON only — no markdown, no commentary.`;

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
      { ok: false, error: "Only .pdf and .docx CVs are supported." },
      { status: 400 },
    );
  }

  const text = await extractCvText(type, await file.arrayBuffer());
  if (!text.trim()) {
    return NextResponse.json(
      { ok: false, error: "Could not read any text from this file." },
      { status: 422 },
    );
  }

  const ai = getAiProvider();
  const raw = await ai.complete(
    [
      {
        role: "system",
        content: `${SCHEMA_DESCRIPTION}\n\n${RULES}`,
      },
      {
        role: "user",
        content: `CV text:\n${text.slice(0, 40_000)}`,
      },
    ],
    { jsonMode: true, temperature: 0.1 },
  );

  const parsed = extractJson(raw);
  if (parsed === null) {
    console.error("[parse-cv] malformed AI JSON:", raw.slice(0, 500));
    return NextResponse.json(
      {
        ok: false,
        error: "The AI returned malformed JSON — please retry.",
        detail: raw.slice(0, 500),
      },
      { status: 502 },
    );
  }

  const profile = enrichFromText(sanitizeParsedProfile(parsed), text);

  return NextResponse.json({ ok: true, profile });
}