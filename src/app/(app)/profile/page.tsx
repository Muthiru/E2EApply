import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/profile/profile-form";

export default async function ProfilePage() {
  const { userId } = await auth.protect();

  const profile = await prisma.profile.findFirst({
    where: { user: { clerkId: userId } },
    include: {
      skills: { orderBy: { createdAt: "asc" } },
      experiences: {
        orderBy: { startDate: { sort: "desc", nulls: "last" } },
      },
      educations: { orderBy: { startDate: { sort: "desc", nulls: "last" } } },
      projects: { orderBy: { createdAt: "asc" } },
      certifications: { orderBy: { createdAt: "asc" } },
      preferences: true,
    },
  });

  const serialized = profile
    ? {
        ...profile,
        educations: profile.educations.map((e) => ({
          ...e,
          gpa: e.gpa ? e.gpa.toString() : null,
        })),
      }
    : null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Master candidate profile</h1>
        <p className="text-muted-foreground">
          Your single source of truth for CVs, cover letters, and match scores.
        </p>
      </div>
      <ProfileForm profile={serialized} />
    </div>
  );
}