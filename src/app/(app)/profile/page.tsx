import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/profile/profile-form";
import { MasterCvManager } from "@/components/profile/master-cv-manager";

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
      masterCvs: { orderBy: { createdAt: "asc" } },
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
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Keep your experience, skills, and preferences in one place.
        </p>
      </div>

      <MasterCvManager cvs={profile?.masterCvs ?? []} />

      <ProfileForm profile={serialized} />
    </div>
  );
}
