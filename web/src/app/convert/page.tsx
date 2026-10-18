"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Boxes,
  CheckCircle2,
  FileCode2,
  GitCompareArrows,
  Layers3,
  Loader2,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import CodeView from "@/components/CodeView";
import { api, type DiffResult, type Sample } from "@/lib/api";import { cn } from "@/lib/utils";

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
  // 真实转换
  const [converting, setConverting] = useState(false);
  const [convertMsg, setConvertMsg] = useState("");
  const [converted, setConverted] = useState(false);
  // 已尝试自动转换的示例（避免重复触发）
  const attemptedRef = useRef<Set<string>>(new Set());
  const convertingIdRef = useRef<string | null>(null);
  // 当前选中的示例 id（供异步回调校验结果归属，防止串样本）
  const selectedIdRef = useRef<string>("");
  useEffect(() => {
    selectedIdRef.current = selected?.id ?? "";
  }, [selected]);

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
    setConverted(false);
    setConvertMsg("");
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

  /** 发起真实转换（需后端具备 torch+paddle 环境） */
  const runRealConvert = async () => {
    if (!selected || convertingIdRef.current) return;
    const sampleId = selected.id;
    convertingIdRef.current = sampleId;
    setConverting(true);
    setConverted(false);
    setConvertMsg("提交转换任务...");

    // 仅在用户仍停留在该示例时才应用结果
    const applyResult = async (d: DiffResult, content: string) => {
      if (selectedIdRef.current !== sampleId) return;
      setTgt(content);
      setDiff({ ops: d.ops, similarity: d.similarity, src_lines: d.src_lines, tgt_lines: d.tgt_lines });
      setConverted(true);
      setConvertMsg("");
      setTab("diff");
    };

    try {
      const res = await api.convert(sampleId);
      // 缓存命中：此前已转换过，直接读取产物与 diff
      if (res.cached) {
        const [d, t] = await Promise.all([api.diff(sampleId), api.target(sampleId)]);
        await applyResult(d, t.content);
        setConverting(false);
        convertingIdRef.current = null;
        return;
      }
      const task_id = res.task_id!;
      const poll = async (): Promise<void> => {
        try {
          const st = await api.taskStatus(task_id);
          if (st.status === "completed") {
            const d = await api.taskDiff(task_id);
            const f = await api.taskFile(task_id, d.file);
            await applyResult(d, f.content);
            setConverting(false);
            convertingIdRef.current = null;
          } else if (st.status === "failed") {
            setConvertMsg(`转换失败：${st.error || st.message || "未知错误"}`);
            setConverting(false);
            convertingIdRef.current = null;
          } else {
            setConvertMsg(st.message || "转换执行中...");
            setTimeout(poll, 2000);
          }
        } catch (e) {
          // 轮询出错（如后端重启导致任务丢失）：解除卡死，允许重试
          setConvertMsg(`状态查询失败：${e instanceof Error ? e.message : "网络错误"}，请重试`);
          setConverting(false);
          convertingIdRef.current = null;
        }
      };
      setTimeout(poll, 1500);
    } catch (e) {
      setConvertMsg(e instanceof Error ? e.message : "转换请求失败");
      setConverting(false);
      convertingIdRef.current = null;
    }
  };

  /** 无预置产物且环境可用时，选中即自动真实转换（每示例一次；有任务在跑则等其完成后补触发） */
  useEffect(() => {
    if (!selected || selected.has_target || !converterAvailable) return;
    if (attemptedRef.current.has(selected.id)) return;
    if (convertingIdRef.current) return; // 其他示例转换中：不标记 attempted，完成后 effect 重跑会补触发
    attemptedRef.current.add(selected.id);
    runRealConvert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, converterAvailable, converting]);

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
                  ) : converterAvailable ? (
                    <span className="ml-1.5 shrink-0 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent-foreground">
                      可转换
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
              {converted && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-50 px-3 py-1 font-mono text-xs text-emerald-700">
                  <CheckCircle2 size={13} />
                  本次真实转换结果
                </span>
              )}
              {converterAvailable ? (
                <button
                  onClick={runRealConvert}
                  disabled={converting}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {converting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> {convertMsg || "转换执行中..."}
                    </>
                  ) : (
                    <>
                      <Zap size={15} /> 真实转换此模型
                    </>
                  )}
                </button>
              ) : (
                <span className="ml-auto" />
              )}
            </div>

            {convertMsg && !converting && (
              <div className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                {convertMsg}
              </div>
            )}

            {/* 无产物 + 环境可用：自动转换进行中 */}
            {!selected.has_target && !converted && converterAvailable && converting && (
              <div>
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm text-primary">
                  <Loader2 size={14} className="animate-spin" />
                  {convertMsg || "正在执行真实转换..."}
                </div>
                <div className="grid gap-3 xl:grid-cols-2">
                  <CodeView code={src} title={`源码 · ${selected.name}.py (PyTorch)`} />
                  <div className="skeleton h-96 rounded-lg" />
                </div>
              </div>
            )}

            {/* 无产物 + 环境不可用：演示模式说明 */}
            {!selected.has_target && !converted && !converterAvailable && (
              <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                该示例暂无预置转换产物（演示模式）。安装 PyTorch 与 PaddlePaddle
                后可通过后端 <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">POST /api/convert</code> 执行真实转换，
                或运行 CLI：<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">python main.py --in_dir &lt;file&gt; --out_dir &lt;dir&gt;</code>
              </div>
            )}

            {/* Tab 切换 */}
            {(selected.has_target || converted) && (
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

            {loading && (
              <div className="grid gap-3 xl:grid-cols-2">
                <div className="skeleton h-96 rounded-lg" />
                <div className="skeleton h-96 rounded-lg" />
              </div>
            )}

            {!loading && tab === "diff" && (selected.has_target || converted) && (
              <div className="grid gap-3 xl:grid-cols-2">
                <CodeView
                  code={src}
                  title={`源码 · ${selected.name}.py (PyTorch)`}
                  diffLines={srcDiff}
                />
                <CodeView
                  code={tgt}
                  title={`产物 · ${selected.name}.py (PaddlePaddle${converted ? " · 刚刚生成" : ""})`}
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
