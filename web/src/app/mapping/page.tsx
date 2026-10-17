"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Layers3, Search, Table2 } from "lucide-react";
import { api, type MappingItem } from "@/lib/api";
import { cn } from "@/lib/utils";

const DIRECTIONS = [
  { key: "pytorch→paddlepaddle", label: "PyTorch → PaddlePaddle" },
  { key: "paddlepaddle→pytorch", label: "PaddlePaddle → PyTorch" },
];

const MATCHER_DESC: Record<string, string> = {
  DirectMatcher: "直接映射",
  FuncParamMatcher: "参数改写",
  SequentialMatcher: "Sequential 容器",
  InitializerMatcher: "初始化器",
  tensorParamMatcher: "张量参数",
  ViewMatcher: "视图/重塑",
  AssertMatcher: "断言",
  LrschedMatcher: "学习率调度",
  OCSMatcher: "算子序列合成",
};

export default function MappingPage() {
  const [direction, setDirection] = useState(DIRECTIONS[0].key);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<MappingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [variantCount, setVariantCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      api
        .mapping(query, direction, 200)
        .then((res) => {
          setItems(res.items);
          setTotal(res.total);
          setVariantCount(res.items.filter((i) => i.has_variant_code).length);
        })
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query, direction]);

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Table2 size={20} className="text-primary" />
          算子映射表
        </h1>
        <span className="font-mono text-xs text-muted-foreground">
          {total} 条规则{query ? "（筛选后）" : ""}
        </span>
        <div className="ml-auto flex gap-1 rounded-lg border border-border bg-muted p-1">
          {DIRECTIONS.map((d) => (
            <button
              key={d.key}
              onClick={() => setDirection(d.key)}
              className={cn(
                "rounded-md px-3 py-1.5 font-mono text-xs transition-colors",
                direction === d.key ? "bg-card font-medium shadow-sm text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-3 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索算子，如 concat、MaxPool、divide ..."
          className="w-full rounded-lg border border-input bg-card py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>

      <div className="mb-4 flex gap-3 font-mono text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-primary" /> 直接/参数映射 {total - variantCount}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-accent" /> 含语义补丁（variantCode）{variantCount}
        </span>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground">加载中...</div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/60">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">源框架 API</th>
                <th className="px-4 py-2.5 font-medium"></th>
                <th className="px-4 py-2.5 font-medium">目标框架 API</th>
                <th className="px-4 py-2.5 font-medium">映射类型</th>
                <th className="px-4 py-2.5 font-medium">语义补丁</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m, i) => (
                <tr key={m.source_api} className={cn("border-b border-border/60 hover:bg-muted/40", i % 2 === 1 && "bg-muted/20")}>
                  <td className="px-4 py-2 font-mono text-[13px]">{m.source_api}</td>
                  <td className="px-2 py-2 text-accent">
                    <ArrowRight size={14} />
                  </td>
                  <td className="px-4 py-2 font-mono text-[13px] text-primary">{m.target_api || "—"}</td>
                  <td className="px-4 py-2">
                    <span className="rounded bg-secondary px-2 py-0.5 font-mono text-[11px] text-secondary-foreground">
                      {MATCHER_DESC[m.matcher] || m.matcher}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {m.has_variant_code ? (
                      <span className="inline-flex items-center gap-1 rounded bg-accent/15 px-2 py-0.5 text-[11px] text-accent-foreground">
                        <Layers3 size={11} className="text-accent" /> variantCode
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    无匹配结果
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
