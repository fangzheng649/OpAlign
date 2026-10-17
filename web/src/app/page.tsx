"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Boxes, GitBranch, Layers, Puzzle, ScanSearch } from "lucide-react";
import { api, type Stats } from "@/lib/api";

const STEPS = [
  {
    icon: ScanSearch,
    title: "算子提取与分类",
    desc: "遍历模型代码 AST，提取全部框架算子，依据映射表判定：一致 / 语义不一致 / 缺失三类。",
  },
  {
    icon: Layers,
    title: "按需分层对齐",
    desc: "对语义不一致算子，在 Python 层与 C 层分别定位差异并打源码级补丁（modified_*.py / 动态库）。",
  },
  {
    icon: Puzzle,
    title: "缺失算子构建",
    desc: "追踪源框架 C 层调用栈，用目标框架已有算子与算术运算合成功能等价表达式。",
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
    <div className="mx-auto max-w-6xl px-8 py-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card px-10 py-14">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(600px 300px at 85% -10%, hsl(199 95% 60% / 0.18), transparent), radial-gradient(500px 260px at 10% 110%, hsl(221 83% 55% / 0.14), transparent)",
          }}
        />
        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 font-mono text-xs text-primary">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-primary" />
            OPERATOR SEMANTIC ALIGNMENT
          </div>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight">
            跨框架模型转换，
            <br />
            在<span className="text-gradient">语义层</span>保证一致
          </h1>
          <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">
            OpAlign 是源代码级的深度学习模型跨框架转换工具。不同于仅做 API 名称映射的方案，
            它对语法不一致、语义不一致、算子缺失三类问题分别处理，逐层对齐框架实现差异，
            保证转换后的模型可执行、输出一致。
          </p>
          <div className="mt-7 flex gap-3">
            <Link
              href="/convert"
              className="top-beam glow-card inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              进入转换工作台 <ArrowRight size={16} />
            </Link>
            <Link
              href="/mapping"
              className="glow-card inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium"
            >
              浏览算子映射表
            </Link>
          </div>
        </div>
      </section>

      {/* 统计卡片 */}
      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="top-beam glow-card rounded-lg border border-border bg-card px-5 py-4">
            <div className="text-xs text-muted-foreground">{c.label}</div>
            <div className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-gradient">{c.value}</div>
            <div className="mt-1 font-mono text-[11px] text-muted-foreground">{c.sub}</div>
          </div>
        ))}
      </section>

      {/* 方法三步 */}
      <section className="mt-10">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <GitBranch size={18} className="text-primary" />
          方法流程
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="top-beam glow-card relative rounded-lg border border-border bg-card p-5">
              <div className="absolute right-4 top-3 font-mono text-3xl font-bold text-primary/10">
                0{i + 1}
              </div>
              <s.icon size={22} className="text-primary" />
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 框架支持 */}
      <section className="mt-10 rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 font-mono text-sm">
          <span className="text-muted-foreground">转换方向：</span>
          <span className="inline-flex items-center gap-2">
            <Boxes size={16} className="text-primary" /> PyTorch → PaddlePaddle（完整支持）
          </span>
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <Boxes size={16} /> PaddlePaddle → PyTorch（反向映射表）
          </span>
        </div>
        {stats && !stats.converter_available && (
          <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
            提示：当前后端未安装 PyTorch / PaddlePaddle，工作台将以演示模式浏览预置转换产物；
            安装两个框架后即可执行真实转换。
          </p>
        )}
      </section>
    </div>
  );
}
