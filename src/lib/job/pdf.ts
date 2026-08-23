import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { CvDocument, CoverLetterDocument } from "@/components/documents/pdf";
import {
  DEFAULT_CL_TEMPLATE,
  DEFAULT_CV_TEMPLATE,
  isClTemplateId,
  isCvTemplateId,
} from "@/lib/job/templates";

import { createDocxFromText } from "./docx";

export function applicationPdfRouteHandler(type: "CV" | "COVER_LETTER") {
  return async function handler(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
  ) {
    const { userId } = await auth.protect();
    const { id } = await params;

    const url = new URL(_request.url);
    const format = url.searchParams.get("format");

    if (format === "docx") {
      const application = await prisma.application.findFirst({
        where: { id, user: { clerkId: userId } },
        include: {
          job: true,
          documents: {
            where: { type },
            orderBy: { version: "desc" },
            take: 1
          }
        }
      });
      if (!application) return new Response("Not found", { status: 404 });
      let text = application.documents[0]?.content ?? null;

      if (!text && type === "CV" && application.masterCvId) {
        const master = await prisma.masterCv.findFirst({ where: { id: application.masterCvId } });
        text = master?.textContent ?? null;
      }
      if (!text) return new Response("Document text not found", { status: 404 });

      const safeCompany = (application.job?.company ?? "job").replace(/[^a-z0-9]+/gi, "-");
      const label = type === "CV" ? "cv" : "cover-letter";
      const buffer = await createDocxFromText(text, userId, type === "CV");

      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${safeCompany}-${label}.docx"`
        }
      });
    }

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
      user: { include: { profile: true } },
      masterCv: true,
      documents: {
        where: { type },
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });

  const document = application?.documents[0];
  const content = document?.content ?? (type === "CV" ? application?.masterCv?.textContent : null);

  if (!application || !content) return null;

  const buffer =
    type === "CV"
      ? await renderToBuffer(
        CvDocument({
          text: content,
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
          contactBlockText: null,
        }),
      )
      : await renderToBuffer(
        CoverLetterDocument({
          text: content,
          template: isClTemplateId(application.clTemplate)
            ? application.clTemplate
            : DEFAULT_CL_TEMPLATE,
        }),
      );

  return { buffer, company: application.job.company ?? "job" };
}
