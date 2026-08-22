import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { renderToBuffer } from "@react-pdf/renderer";
import { CvDocument } from "@/components/documents/pdf";

export async function GET(request: Request) {
  const { userId } = await auth.protect();
  const url = new URL(request.url);
  const cvId = url.searchParams.get("id");

  if (!cvId) {
    return new Response("No master CV ID provided.", { status: 400 });
  }

  const cv = await prisma.masterCv.findFirst({
    where: { id: cvId, profile: { user: { clerkId: userId } } },
    select: { fileName: true, fileData: true, textContent: true },
  });

  if (!cv) {
    return new Response("CV not found.", { status: 404 });
  }

  // If there's an actual uploaded file blob, serve it normally
  if (cv.fileData && cv.fileData.byteLength > 0) {
    const lower = cv.fileName.toLowerCase();
    let contentType = "application/octet-stream";
    if (lower.endsWith(".pdf")) {
      contentType = "application/pdf";
    } else if (lower.endsWith(".docx")) {
      contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }

    const safeFileName = cv.fileName.replace(/[\r\n"]/g, "");
    return new Response(new Uint8Array(cv.fileData), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeFileName}"`,
      },
    });
  }

  // If no blob but it has generated textContent, dynamically render it!
  if (cv.textContent) {
    const profile = await prisma.profile.findFirst({
      where: { user: { clerkId: userId } },
    });

    if (!profile) return new Response("Profile not found.", { status: 404 });

    const buffer = await renderToBuffer(
      CvDocument({
        text: cv.textContent,
        template: "faangpath", // Using beautiful default for Master
        header: {
          fullName: profile.fullName ?? null,
          title: profile.title ?? null,
          location: profile.location ?? null,
          email: profile.email ?? null,
          phone: profile.phone ?? null,
          github: profile.github ?? null,
          linkedin: profile.linkedin ?? null,
        },
      })
    );

    let safeName = cv.fileName.replace(/[\r\n"]/g, "");
    if (!safeName.toLowerCase().endsWith(".pdf")) {
      safeName += ".pdf";
    }

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}"`,
      }
    });
  }

  return new Response("CV is entirely empty.", { status: 404 });
}