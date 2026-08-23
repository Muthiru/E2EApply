"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/applications", label: "Applications" },
  { href: "/profile", label: "Profile" },
];

export default function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 text-sm">
      {navItems.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" &&
            pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
              active
                ? "text-foreground bg-[#f4f4f5]"
                : "text-muted-foreground hover:text-foreground hover:bg-[#f4f4f5]"
            }`}
          >
            {item.label}
            {active && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-4 bg-foreground rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}