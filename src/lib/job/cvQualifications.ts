import { getAiProvider } from "@/lib/ai";
import { isRecord, strArray } from "@/lib/ai/parse";
import { extractJson } from "@/lib/cv/sanitize";

export type CvQualifications = {
  roleTitles: string[];
  skills: string[];
  countries: string[];
};

/** Extract concise, evidence-based search terms without sending the full CV to search providers. */
export async function extractCvQualifications(
  cvText: string,
): Promise<CvQualifications | null> {
  try {
    const raw = await getAiProvider().complete(
      [
        {
          role: "system",
          content: `Extract job-search qualifications and explicitly stated work locations from the candidate's CV. Return one JSON object only: {"roleTitles": string[], "skills": string[], "countries": string[]}. Include role titles and concrete skills evidenced in the CV. For countries, return only country names explicitly written in the CV as the candidate's current location or work location; do not infer from employers, schools, or citizenship. Do not return names, contact details, employers, dates, or complete sentences. Limit roleTitles to 5, skills to 15, and countries to 3.`,
        },
        { role: "user", content: cvText.slice(0, 30000) },
      ],
      { jsonMode: true, temperature: 0.1 },
    );

    const parsed = extractJson(raw);
    if (!isRecord(parsed)) return null;
    const cvEvidence = cvText.toLowerCase().replace(/\s+/g, " ");

    const cleanTerms = (terms: string[], limit: number) =>
      [...new Set(terms.map((term) => term.trim()).filter((term) =>
        term.length > 1 &&
        term.length <= 80 &&
        cvEvidence.includes(term.toLowerCase().replace(/\s+/g, " ")),
      ))]
        .slice(0, limit);

    const qualifications = {
      roleTitles: cleanTerms(strArray(parsed.roleTitles), 5),
      skills: cleanTerms(strArray(parsed.skills), 15),
      countries: cleanTerms(strArray(parsed.countries), 3),
    };
    return qualifications.roleTitles.length > 0 || qualifications.skills.length > 0 || qualifications.countries.length > 0
      ? qualifications
      : null;
  } catch {
    return null;
  }
}
