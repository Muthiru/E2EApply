import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import AppNav from "@/components/app-nav";
import { ensureUser } from "@/lib/user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth.protect();
  await ensureUser(userId);
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
            E2E Apply
          </Link>
          <div className="flex items-center gap-4">
            <AppNav />
            <UserButton
              appearance={{
                elements: { avatarBox: "h-8 w-8" },
              }}
            />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}