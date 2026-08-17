import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";

export default async function LandingPage() {
  const { userId } = await auth();

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="text-lg font-semibold">E2E Apply</span>
        <div>
          {userId ? (
            <Link href="/dashboard" className="text-sm font-medium underline">
              Dashboard
            </Link>
          ) : (
            <SignInButton mode="modal" />
          )}
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-1 flex-col justify-center gap-6 px-6 py-16">
        <h1 className="text-4xl font-bold">
          From job discovery to outcome. Not just another CV generator.
        </h1>
        <p className="text-lg text-muted-foreground">
          Paste a job, get an honest match score (including the reasons to skip
          it), tailored CV and cover letter, and a tracker that closes the loop
          from applied to rejected, interview, or offer.
        </p>
        <div className="flex gap-3">
          {userId ? (
            <Link
              href="/dashboard"
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
            >
              Go to dashboard
            </Link>
          ) : (
            <SignInButton mode="modal" />
          )}
        </div>
      </main>
    </div>
  );
}