"use client";

import { useMemo } from "react";
import { tokenizeLine } from "@/lib/highlight";
import { cn } from "@/lib/utils";

/**
 * 代码视图：行号 + 轻量语法着色 + diff 行底色
 * diffLines: 行号(1-based) -> "ins" | "del"
 */
export default function CodeView({
  code,
  title,
  diffLines,
  className,
}: {
  code: string;
  title?: string;
  diffLines?: Map<number, "ins" | "del">;
  className?: string;
}) {
  const lines = useMemo(() => code.replace(/\n$/, "").split("\n"), [code]);

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border bg-card", className)}>
      {title && (
        <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-primary/60" />
          <span className="font-mono text-xs text-muted-foreground">{title}</span>
        </div>
      )}
      <div className="code-scroll max-h-[560px] overflow-auto">
        <table className="w-full border-collapse font-mono text-[12.5px] leading-5">
          <tbody>
            {lines.map((line, i) => {
              const n = i + 1;
              const kind = diffLines?.get(n);
              return (
                <tr key={n} className={kind === "ins" ? "diff-ins" : kind === "del" ? "diff-del" : undefined}>
                  <td
                    className={cn(
                      "w-10 select-none border-r border-border/60 px-2 text-right align-top text-[11px] text-muted-foreground/70",
                      kind === "ins" && "diff-gutter-ins",
                      kind === "del" && "diff-gutter-del",
                    )}
                  >
                    {n}
                  </td>
                  <td className="whitespace-pre px-3 align-top">
                    {tokenizeLine(line).map((t, j) => (
                      <span key={j} className={t.cls}>
                        {t.text}
                      </span>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
