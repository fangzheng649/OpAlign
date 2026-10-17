"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, BookOpen, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { name: "总览", href: "/", icon: LayoutDashboard },
  { name: "转换工作台", href: "/convert", icon: ArrowLeftRight },
  { name: "算子映射", href: "/mapping", icon: BookOpen },
];

export default function SideNav() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-52 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center border-b border-border px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent font-mono text-sm font-bold text-primary-foreground shadow-[0_4px_14px_-2px] shadow-primary/40">
            OA
          </div>
          <div>
            <div className="font-mono text-sm font-bold tracking-wider">
              OpAlign<span className="text-accent">·</span>
            </div>
            <div className="text-[10px] tracking-wide text-muted-foreground">Operator Semantic Alignment</div>
          </div>
        </div>
      </div>
      <nav className="flex flex-col gap-y-1 p-2">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center rounded-md px-2.5 py-2 text-sm transition-colors",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "absolute -left-2 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-primary to-accent transition-opacity",
                  active ? "opacity-100" : "opacity-0",
                )}
              />
              <Icon size={16} className="mr-2.5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <footer className="mt-auto border-t border-border p-3">
        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <span className="pulse-dot h-2 w-2 rounded-full bg-primary" />
          <span>PYTORCH → PADDLE</span>
        </div>
      </footer>
    </aside>
  );
}
