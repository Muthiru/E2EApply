import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { CvDocument, CoverLetterDocument } from "@/components/documents/pdf";
import { extractMasterCvContactBlock } from "@/lib/job/documents";
import {
  DEFAULT_CL_TEMPLATE,
  DEFAULT_CV_TEMPLATE,
  isClTemplateId,
  isCvTemplateId,
} from "@/lib/job/templates";

export function applicationPdfRouteHandler(type: "CV" | "COVER_LETTER") {
  return async function handler(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) {
    const { userId } = await auth.protect();
    const { id } = await params;

    const result = await renderApplicationPdf(id, type, userId);
    if (!result) return new Response("Not found", { status: 404 });

    const safeCompany = result.company.replace(/[^a-z0-9]+/gi, "-");
    const label = type === "CV" ? "cv" : "cover-letter";
    return new Response(new Uint8Array(result.buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeCompany}-${label}.pdf"`,
      },
    });
  };
}

export async function renderApplicationPdf(
  applicationId: string,
  type: "CV" | "COVER_LETTER",
  userId: string,
): Promise<{ buffer: Buffer; company: string } | null> {
  const application = await prisma.application.findFirst({
    where: { id: applicationId, user: { clerkId: userId } },
    include: {
      job: true,
      documents: {
        where: { type },
        orderBy: [{ isFinal: "desc" }, { version: "desc" }],
        take: 1,
      },
      masterCv: true,
      user: { include: { profile: true } },
    },
  });

  const document = application?.documents[0];
  if (!application || !document?.content) return null;
  const masterCvContactBlock = extractMasterCvContactBlock(
    application.masterCv?.textContent,
  );

  const buffer =
    type === "CV"
      ? await renderToBuffer(
        CvDocument({
          text: document.content,
          template: isCvTemplateId(application.cvTemplate)
            ? application.cvTemplate
            : DEFAULT_CV_TEMPLATE,
          header: {
            fullName: application.user.profile?.fullName ?? null,
            title: application.user.profile?.title ?? null,
            location: application.user.profile?.location ?? null,
            email: application.user.profile?.email ?? null,
            phone: application.user.profile?.phone ?? null,
            github: application.user.profile?.github ?? null,
            linkedin: application.user.profile?.linkedin ?? null,
          },
          contactBlockText: masterCvContactBlock,
        }),
      )
      : await renderToBuffer(
        CoverLetterDocument({
          text: document.content,
          template: isClTemplateId(application.clTemplate)
            ? application.clTemplate
            : DEFAULT_CL_TEMPLATE,
        }),
      );

  return { buffer, company: application.job.company ?? "job" };
}
