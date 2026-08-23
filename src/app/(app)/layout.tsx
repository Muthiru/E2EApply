import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import AppNav from "@/components/app-nav";
import { ensureUser } from "@/lib/user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth.protect();
  await ensureUser(userId);
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground hover:text-primary transition-colors"
          >
            <span className="text-primary">E2E</span>
            <span>Apply</span>
          </Link>
          <div className="flex items-center gap-6">
            <AppNav />
            <UserButton
              appearance={{
                elements: { 
                  avatarBox: "h-9 w-9 ring-2 ring-border ring-offset-2 ring-offset-background" 
                },
              }}
            />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {children}
      </main>
    </div>
  );
}