import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function getOwnedApplication<I extends Prisma.ApplicationInclude>(
  applicationId: string,
  include: I,
) {
  const { userId } = await auth.protect();
  return prisma.application.findFirst({
    where: { id: applicationId, user: { clerkId: userId } },
    include,
  });
}