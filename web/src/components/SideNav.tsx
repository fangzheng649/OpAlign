"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, BarChart3, BookOpen, LayoutDashboard } from "lucide-react";
import Logo from "@/components/Logo";
import { cn } from "@/lib/utils";

const NAV_SECTIONS = [
  {
    label: "工作台",
    items: [
      { name: "总览", href: "/", icon: LayoutDashboard },
      { name: "模型转换", href: "/convert", icon: ArrowLeftRight },
      { name: "算子映射", href: "/mapping", icon: BookOpen },
    ],
  },
  {
    label: "成果",
    items: [{ name: "实验评测", href: "/results", icon: BarChart3 }],
  },
];

export default function SideNav() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 z-40 flex h-screen w-60 shrink-0 flex-col border-r border-border bg-card/80 backdrop-blur">
      {/* 品牌区 */}
      <Link href="/" className="flex items-center gap-3 border-b border-border px-5 py-4 transition-colors hover:bg-muted/40">
        <Logo size={40} className="shadow-soft-md rounded-[10px]" />
        <div className="min-w-0">
          <div className="font-sans text-[15px] font-bold leading-tight tracking-tight">
            OpAlign<span className="text-accent">.</span>
          </div>
          <div className="mt-0.5 truncate font-mono text-[10px] tracking-wide text-muted-foreground">
            OPERATOR ALIGNMENT
          </div>
        </div>
      </Link>

      {/* 导航 */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="px-2.5 pb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center rounded-lg px-2.5 py-2 text-[13.5px] transition-colors",
                      active
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-primary to-accent transition-opacity",
                        active ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <Icon size={16} strokeWidth={1.8} className="mr-2.5 shrink-0" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* 底部状态 */}
      <footer className="space-y-2.5 border-t border-border px-4 py-3.5">
        <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>PYTORCH → PADDLEPADDLE</span>
        </div>
        <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground/60">
          <span>v0.1.0</span>
          <span>541 RULES</span>
        </div>
      </footer>
    </aside>
  );
}
