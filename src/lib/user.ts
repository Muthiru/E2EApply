import { prisma } from "@/lib/prisma";

export async function ensureUser(clerkId: string) {
  return prisma.user.upsert({
    where: { clerkId },
    create: { clerkId, profile: { create: {} } },
    update: {},
  });
}