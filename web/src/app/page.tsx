"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, ArrowRight, BarChart3, BookOpen, Boxes, Layers, Puzzle, ScanSearch } from "lucide-react";
import Logo from "@/components/Logo";
import PipelineFlow from "@/components/PipelineFlow";
import { api, type Stats } from "@/lib/api";

const STEPS = [
  {
    icon: ScanSearch,
    title: "算子提取与分类",
    desc: "遍历模型代码 AST，提取全部框架算子及其上下文，依据映射表判定为一致、语义不一致或缺失三类。",
  },
  {
    icon: Layers,
    title: "按需分层对齐",
    desc: "语义不一致算子在 Python 层与 C 层分别定位差异、打源码级补丁，仅在不兼容参数出现时介入。",
  },
  {
    icon: Puzzle,
    title: "缺失算子构建",
    desc: "追踪源框架 C 层调用栈提取计算逻辑，用目标框架已有算子与算术运算合成功能等价表达式。",
  },
];

export default function HomePage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.stats().then(setStats).catch(() => {});
  }, []);

  const fwd = stats?.mappings["pytorch→paddlepaddle"];
  const cards = [
    { label: "算子映射规则", value: fwd ? fwd.total : "-", sub: "PyTorch → PaddlePaddle" },
    { label: "语义补丁算子", value: fwd ? fwd.variant_code : "-", sub: "variantCode 源码级对齐" },
    { label: "示例模型", value: stats ? stats.sample_total : "-", sub: "vision / text / audio" },
    { label: "预置转换产物", value: stats ? stats.sample_with_target : "-", sub: "可直接浏览 diff" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-8 pb-14 pt-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card px-10 py-14 shadow-soft-md">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(560px 300px at 88% -12%, hsl(199 95% 55% / 0.16), transparent), radial-gradient(480px 260px at 8% 112%, hsl(221 83% 55% / 0.12), transparent)",
          }}
        />
        <div className="relative">
          <div className="mb-5 flex items-center gap-3">
            <Logo size={44} className="shadow-soft-md rounded-xl" />
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 py-1 font-mono text-[11px] text-primary">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-primary" />
              OPERATOR SEMANTIC ALIGNMENT
            </div>
          </div>
          <h1 className="max-w-2xl text-[40px] font-bold leading-[1.15] tracking-tight">
            跨框架模型转换，
            <br />
            在<span className="text-gradient">语义层</span>保证一致
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            OpAlign 是源代码级的深度学习模型跨框架转换工具。不同于仅做 API 名称映射的方案，
            它针对语法不一致、语义不一致、算子缺失三类问题分别处理，逐层对齐框架实现差异。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/convert"
              className="top-beam inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-soft-md transition-all hover:shadow-soft-lg"
            >
              <ArrowLeftRight size={16} /> 进入转换工作台
            </Link>
            <Link
              href="/results"
              className="glow-card inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium"
            >
              <BarChart3 size={16} className="text-primary" /> 查看实验评测
            </Link>
            <Link
              href="/mapping"
              className="inline-flex items-center gap-1.5 px-2 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              算子映射表 <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* 统计条 */}
      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="top-beam glow-card rounded-xl border border-border bg-card px-5 py-4 shadow-soft-sm">
            <div className="text-xs text-muted-foreground">{c.label}</div>
            <div className="mt-1.5 text-[26px] font-bold tabular-nums leading-none tracking-tight text-gradient">{c.value}</div>
            <div className="mt-1.5 font-mono text-[10.5px] text-muted-foreground">{c.sub}</div>
          </div>
        ))}
      </section>

      {/* 方法流程图 */}
      <section className="mt-5 rounded-xl border border-border bg-card p-6 shadow-soft-sm">
        <header className="mb-2 flex items-baseline gap-3">
          <h2 className="text-[15px] font-semibold tracking-tight">方法流程</h2>
          <span className="font-mono text-[10.5px] text-muted-foreground">源代码级 · 按需逐层对齐</span>
        </header>
        <PipelineFlow />
      </section>

      {/* 三模块 */}
      <section className="mt-5 grid gap-3 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.title} className="glow-card relative rounded-xl border border-border bg-card p-5 shadow-soft-sm">
            <div className="absolute right-4 top-3 font-mono text-3xl font-bold text-primary/10">0{i + 1}</div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <s.icon size={18} strokeWidth={1.8} className="text-primary" />
            </div>
            <h3 className="mt-3.5 text-[14.5px] font-semibold">{s.title}</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </section>

      {/* 支持范围 */}
      <section className="mt-5 rounded-xl border border-border bg-card px-6 py-5 shadow-soft-sm">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 font-mono text-xs">
          <span className="text-muted-foreground">转换方向</span>
          <span className="inline-flex items-center gap-2">
            <Boxes size={15} strokeWidth={1.8} className="text-primary" /> PyTorch → PaddlePaddle
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">完整支持</span>
          </span>
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <Boxes size={15} strokeWidth={1.8} /> PaddlePaddle → PyTorch
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">反向映射表</span>
          </span>
        </div>
        {stats && !stats.converter_available && (
          <p className="mt-3.5 border-t border-border pt-3.5 text-xs leading-relaxed text-muted-foreground">
            提示：当前后端未安装 PyTorch / PaddlePaddle，工作台以演示模式浏览预置产物；安装两个框架后即可执行真实转换。
          </p>
        )}
      </section>
    </div>
  );
}
