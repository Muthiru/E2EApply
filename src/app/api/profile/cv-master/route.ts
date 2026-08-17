import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth.protect();

  const profile = await prisma.profile.findFirst({
    where: { user: { clerkId: userId } },
    select: { masterCvName: true, masterCvData: true },
  });

  if (!profile?.masterCvData || !profile.masterCvName) {
    return new Response("No master CV uploaded yet.", { status: 404 });
  }

  const lower = profile.masterCvName.toLowerCase();
  const contentType = lower.endsWith(".pdf")
    ? "application/pdf"
    : lower.endsWith(".docx")
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : "application/octet-stream";

  return new Response(new Uint8Array(profile.masterCvData), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${profile.masterCvName}"`,
    },
  });
}