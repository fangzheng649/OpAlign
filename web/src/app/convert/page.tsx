"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  FileCode2,
  GitCompareArrows,
  Layers3,
  Search,
  Sparkles,
} from "lucide-react";
import CodeView from "@/components/CodeView";
import { api, type DiffResult, type Sample } from "@/lib/api";
import { cn } from "@/lib/utils";

const DOMAIN_LABEL: Record<string, string> = {
  vision: "视觉",
  text: "文本",
  audio: "音频",
};

export default function ConvertPage() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [converterAvailable, setConverterAvailable] = useState(false);
  const [selected, setSelected] = useState<Sample | null>(null);
  const [query, setQuery] = useState("");
  const [src, setSrc] = useState("");
  const [tgt, setTgt] = useState("");
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [patch, setPatch] = useState<{ name: string; content: string } | null>(null);
  const [tab, setTab] = useState<"diff" | "patch">("diff");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.samples().then((res) => {
      setSamples(res.samples);
      setConverterAvailable(res.converter_available);
      const first = res.samples.find((s) => s.has_target) || res.samples[0];
      if (first) setSelected(first);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    setPatch(null);
    setTab("diff");
    Promise.all([
      api.source(selected.id).catch(() => ({ content: "", file: "" })),
      selected.has_target
        ? api.target(selected.id).catch(() => ({ content: "", file: "" }))
        : Promise.resolve({ content: "", file: "" }),
      selected.has_target
        ? api.diff(selected.id).catch(() => null)
        : Promise.resolve(null),
    ]).then(([s, t, d]) => {
      setSrc(s.content);
      setTgt(t.content);
      setDiff(d);
      setLoading(false);
    });
  }, [selected]);

  const loadPatch = async (name: string) => {
    if (!selected) return;
    const res = await api.target(selected.id, name).catch(() => ({ content: "", file: name }));
    setPatch({ name, content: res.content });
    setTab("patch");
  };

  const { srcDiff, tgtDiff } = useMemo(() => {
    const a = new Map<number, "ins" | "del">();
    const b = new Map<number, "ins" | "del">();
    if (diff) {
      for (const op of diff.ops) {
        if (op.tag === "delete" || op.tag === "replace")
          for (let i = op.a1 + 1; i <= op.a2; i++) a.set(i, "del");
        if (op.tag === "insert" || op.tag === "replace")
          for (let j = op.b1 + 1; j <= op.b2; j++) b.set(j, "ins");
      }
    }
    return { srcDiff: a, tgtDiff: b };
  }, [diff]);

  const grouped = useMemo(() => {
    const g: Record<string, Sample[]> = {};
    for (const s of samples) {
      if (query && !s.name.toLowerCase().includes(query.toLowerCase())) continue;
      (g[s.domain] ||= []).push(s);
    }
    return g;
  }, [samples, query]);

  return (
    <div className="flex min-h-screen">
      {/* 左栏：示例列表 */}
      <div className="w-64 shrink-0 border-r border-border bg-card">
        <div className="border-b border-border p-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索示例模型..."
              className="w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          {!converterAvailable && (
            <div className="mt-2 flex items-start gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-2 py-1.5 text-[11px] leading-snug text-accent-foreground">
              <Sparkles size={12} className="mt-0.5 shrink-0 text-accent" />
              演示模式：浏览预置转换产物（安装 torch+paddle 后可真实转换）
            </div>
          )}
        </div>
        <div className="code-scroll max-h-[calc(100vh-8rem)] overflow-auto p-2">
          {Object.entries(grouped).map(([domain, items]) => (
            <div key={domain} className="mb-3">
              <div className="px-2 pb-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                {DOMAIN_LABEL[domain] || domain}
              </div>
              {items.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className={cn(
                    "group mb-0.5 flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                    selected?.id === s.id
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/80 hover:bg-muted",
                  )}
                >
                  <span className="truncate font-mono text-[13px]">{s.name}</span>
                  {s.has_target ? (
                    <span className="ml-1.5 shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                      产物
                    </span>
                  ) : (
                    <span className="ml-1.5 shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      源码
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 主区 */}
      <div className="min-w-0 flex-1 p-6">
        {selected && (
          <>
            {/* 头部 */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h1 className="flex items-center gap-2 font-mono text-xl font-bold">
                <FileCode2 size={20} className="text-primary" />
                {selected.name}
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 font-mono text-xs text-primary">
                <Boxes size={13} /> PyTorch
                <span className="text-accent">→</span> PaddlePaddle
              </span>
              {diff && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 font-mono text-xs text-muted-foreground">
                  <GitCompareArrows size={13} />
                  行相似度 {(diff.similarity * 100).toFixed(1)}% · {diff.ops.length} 处变更
                </span>
              )}
              {selected.patches.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 font-mono text-xs text-accent-foreground">
                  <Layers3 size={13} className="text-accent" />
                  {selected.patches.length} 个语义补丁
                </span>
              )}
            </div>

            {!selected.has_target && (
              <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                该示例暂无预置转换产物（演示模式）。安装 PyTorch 与 PaddlePaddle
                后可通过后端 <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">POST /api/convert</code> 执行真实转换，
                或运行 CLI：<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">python main.py --in_dir &lt;file&gt; --out_dir &lt;dir&gt;</code>
              </div>
            )}

            {/* Tab 切换 */}
            {selected.has_target && (
              <div className="mb-3 flex gap-1 rounded-lg border border-border bg-muted p-1">
                <button
                  onClick={() => setTab("diff")}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-sm transition-colors",
                    tab === "diff" ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  转换对比（源码 ↔ 产物）
                </button>
                {selected.patches.length > 0 && (
                  <button
                    onClick={() => setTab("patch")}
                    className={cn(
                      "flex-1 rounded-md px-3 py-1.5 text-sm transition-colors",
                      tab === "patch" ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    语义补丁（{selected.patches.length}）
                  </button>
                )}
              </div>
            )}

            {loading && <div className="py-20 text-center text-sm text-muted-foreground">加载中...</div>}

            {!loading && tab === "diff" && selected.has_target && (
              <div className="grid gap-3 xl:grid-cols-2">
                <CodeView
                  code={src}
                  title={`源码 · ${selected.name}.py (PyTorch)`}
                  diffLines={srcDiff}
                />
                <CodeView
                  code={tgt}
                  title={`产物 · ${selected.name}.py (PaddlePaddle)`}
                  diffLines={tgtDiff}
                />
              </div>
            )}

            {!loading && tab === "patch" && (
              <div className="flex gap-3">
                <div className="w-56 shrink-0 space-y-1">
                  {selected.patches.map((p) => (
                    <button
                      key={p}
                      onClick={() => loadPatch(p)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left font-mono text-xs transition-colors",
                        patch?.name === p
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border bg-card hover:border-primary/30",
                      )}
                    >
                      <Layers3 size={14} className={patch?.name === p ? "text-primary" : "text-muted-foreground"} />
                      <span className="truncate">{p}</span>
                    </button>
                  ))}
                  <p className="px-1 pt-2 text-[11px] leading-relaxed text-muted-foreground">
                    语义补丁：目标框架算子实现与源框架存在语义差异时，OpAlign
                    在框架源码层面修改实现并持久化为补丁文件，随转换产物一起分发。
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  {patch ? (
                    <CodeView code={patch.content} title={`补丁 · ${patch.name}`} />
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                      选择左侧补丁文件查看
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
