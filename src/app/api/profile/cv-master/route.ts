import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { userId } = await auth.protect();
  const url = new URL(request.url);
  const cvId = url.searchParams.get("id");

  if (!cvId) {
    return new Response("No master CV ID provided.", { status: 400 });
  }

  const cv = await prisma.masterCv.findFirst({
    where: { id: cvId, profile: { user: { clerkId: userId } } },
    select: { fileName: true, fileData: true },
  });

  if (!cv || !cv.fileData) {
    return new Response("CV not found.", { status: 404 });
  }

  const lower = cv.fileName.toLowerCase();
  const contentType = lower.endsWith(".pdf")
    ? "application/pdf"
    : lower.endsWith(".docx")
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : "application/octet-stream";

  const safeFileName = cv.fileName.replace(/[\r\n"]/g, "");
  return new Response(new Uint8Array(cv.fileData), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${safeFileName}"`,
    },
  });
}