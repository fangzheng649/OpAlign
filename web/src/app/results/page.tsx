"use client";

import { useEffect, useState } from "react";
import { VChart } from "@visactor/react-vchart";
import { AlertTriangle, FlaskConical, Gauge, Layers3, Scale, Shuffle } from "lucide-react";
import { api, type ResultsData } from "@/lib/api";

/* 蓝色家族图表配色（与主题一致） */
const C = {
  blue: "#2563eb",
  cyan: "#0891b2",
  indigo: "#6366f1",
  sky: "#38bdf8",
  teal: "#0d9488",
  gray: "#94a3b8",
  faint: "#cbd5e1",
  ink: "#1e293b",
};

const AXIS_STYLE = {
  label: { style: { fontSize: 11, fill: "#64748b" } },
  grid: { style: { stroke: "#e2e8f0", lineWidth: 0.5 } },
};

function ChartCard({
  title,
  icon: Icon,
  note,
  children,
  className = "",
}: {
  title: string;
  icon: React.ElementType;
  note?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`top-beam rounded-xl border border-border bg-card p-5 shadow-soft-sm ${className}`}>
      <header className="mb-3 flex items-baseline gap-2">
        <Icon size={16} strokeWidth={1.8} className="translate-y-0.5 text-primary" />
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {note && <span className="ml-auto font-mono text-[11px] text-muted-foreground">{note}</span>}
      </header>
      {children}
    </section>
  );
}

export default function ResultsPage() {
  const [data, setData] = useState<ResultsData | null>(null);

  useEffect(() => {
    api.results().then(setData).catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-8 py-8">
        <div className="skeleton h-8 w-48 rounded-lg" />
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
        <div className="skeleton h-72 rounded-xl" />
        <div className="skeleton h-72 rounded-xl" />
      </div>
    );
  }

  const ov = data.overview;
  const statCards = [
    { label: "算子语义分析", value: ov.analyzed_operators.toLocaleString(), sub: "PyTorch × Paddle 配对算子" },
    { label: "需语义处理", value: `${Math.round(ov.semantic_attention_ratio * 100)}%`, sub: "语义不一致 + 算子缺失" },
    { label: "算子转换成功率", value: `${Math.round(ov.conversion_success_rate * 100)}%`, sub: `${data.conversion.success}/${data.conversion.total} 个算子` },
    { label: "跨领域验证模型", value: ov.robustness_models, sub: "视觉 / 文本 / 音频" },
  ];

  /* 1. 三类不一致 — 环形图 */
  const donutSpec = {
    type: "pie",
    data: [{ id: "inc", values: data.inconsistency.map((d) => ({ type: d.type, value: d.count })) }],
    categoryField: "type",
    valueField: "value",
    innerRadius: 0.62,
    outerRadius: 0.88,
    padAngle: 1.5,
    cornerRadius: 5,
    color: [C.blue, C.sky, C.faint],
    legends: { visible: true, orient: "bottom", item: { label: { style: { fontSize: 12 } } } },
    label: {
      visible: true,
      style: { fontSize: 12, fontWeight: 600 },
      formatMethod: (t: string, d: Record<string, unknown>) =>
        `${Math.round((d?.value as number) / 13.49)}%`,
    },
    tooltip: {
      mark: {
        content: [
          {
            key: (d: Record<string, unknown>) => d?.type,
            value: (d: Record<string, unknown>) => `${d?.value} 个算子`,
          },
        ],
      },
    },
  };

  /* 2. 转换成功率 — 条形图 */
  const convSpec = {
    type: "bar",
    data: [
      {
        id: "conv",
        values: [
          ...data.conversion.by_type.map((t) => ({ type: t.type, rate: t.rate })),
          { type: "总体", rate: 91.0 },
        ],
      },
    ],
    xField: "type",
    yField: "rate",
    padding: { left: 12, right: 12, top: 16, bottom: 4 },
    color: {
      type: "ordinal",
      domain: ["TensorOps", "LayerOps", "OtherOps", "总体"],
      range: [C.blue, C.cyan, C.sky, C.indigo],
    },
    bar: { style: { cornerRadius: [6, 6, 0, 0] }, width: 46 },
    axes: [
      { orient: "bottom", type: "band", ...AXIS_STYLE, domainLine: { visible: false }, tick: { visible: false } },
      { orient: "left", type: "linear", min: 0, max: 100, ...AXIS_STYLE, label: { formatMethod: (v: string) => `${v}%`, style: { fontSize: 11, fill: "#64748b" } } },
    ],
    label: { visible: true, position: "top", style: { fontSize: 11, fill: C.ink, fontWeight: 600 }, formatMethod: (t: string) => `${t}%` },
    tooltip: {
      mark: {
        content: [
          { key: (d: Record<string, unknown>) => d?.type, value: (d: Record<string, unknown>) => `${d?.rate}%` },
        ],
      },
    },
    legends: { visible: false },
  };

  /* 3. 模型 F1 对比 — 分组柱状（null 视为不支持，不画） */
  const modelRows = data.model_comparison.rows;
  const modelValues = modelRows.flatMap((r) => [
    { model: r.model, method: "ONNX", f1: r.onnx },
    { model: r.model, method: "PaConvert", f1: r.paconvert },
    { model: r.model, method: "OpAlign", f1: r.ours },
  ]).filter((v) => v.f1 !== null);
  const f1Spec = {
    type: "bar",
    data: [{ id: "f1", values: modelValues }],
    xField: ["model", "method"],
    yField: "f1",
    seriesField: "method",
    padding: { left: 12, right: 12, top: 16, bottom: 4 },
    color: [C.faint, C.gray, C.blue],
    bar: { style: { cornerRadius: [3, 3, 0, 0] } },
    axes: [
      { orient: "bottom", type: "band", ...AXIS_STYLE, domainLine: { visible: false }, tick: { visible: false } },
      { orient: "left", type: "linear", min: 0.4, max: 0.8, ...AXIS_STYLE },
    ],
    legends: { visible: true, orient: "bottom", item: { label: { style: { fontSize: 12 } } } },
    tooltip: { mark: { content: [{ key: (d: Record<string, unknown>) => `${d?.method}`, value: (d: Record<string, unknown>) => (d?.f1 as number).toFixed(4) }] } },
  };

  /* 4. Metric Gap 分组柱状 */
  const gapValues = data.robustness.rows.flatMap((r) => [
    { dataset: r.dataset, method: "OpAlign", gap: r.ours },
    { dataset: r.dataset, method: "ONNX", gap: r.onnx },
    { dataset: r.dataset, method: "PaConvert", gap: r.paconvert },
  ]);
  const gapSpec = {
    type: "bar",
    data: [{ id: "gap", values: gapValues }],
    xField: ["dataset", "method"],
    yField: "gap",
    seriesField: "method",
    padding: { left: 12, right: 12, top: 16, bottom: 4 },
    color: [C.blue, C.faint, C.gray],
    bar: { style: { cornerRadius: [3, 3, 0, 0] } },
    axes: [
      { orient: "bottom", type: "band", ...AXIS_STYLE, domainLine: { visible: false }, tick: { visible: false } },
      { orient: "left", type: "linear", min: 0, ...AXIS_STYLE },
    ],
    legends: { visible: true, orient: "bottom", item: { label: { style: { fontSize: 12 } } } },
    tooltip: { mark: { content: [{ key: (d: Record<string, unknown>) => `${d?.method}`, value: (d: Record<string, unknown>) => (d?.gap as number).toFixed(4) }] } },
  };

  /* 5. LLM 对比 — 水平条 */
  const llmSpec = {
    type: "bar",
    data: [{ id: "llm", values: data.llm_comparison.map((l) => ({ name: l.name, passed: l.passed })) }],
    xField: "passed",
    yField: "name",
    seriesField: "name",
    direction: "horizontal",
    padding: { left: 12, right: 40, top: 8, bottom: 8 },
    color: {
      type: "ordinal",
      domain: data.llm_comparison.map((l) => l.name),
      range: [C.faint, C.gray, C.sky, C.blue],
    },
    bar: { style: { cornerRadius: [0, 5, 5, 0] }, width: 18 },
    axes: [
      { orient: "bottom", type: "linear", min: 0, max: 18, ...AXIS_STYLE },
      { orient: "left", type: "band", domainLine: { visible: false }, tick: { visible: false }, label: { style: { fontSize: 12 } } },
    ],
    label: { visible: true, position: "right", style: { fontSize: 11, fontWeight: 600, fill: C.ink }, formatMethod: (t: string) => `${t}/18` },
    legends: { visible: false },
    tooltip: { mark: { content: [{ key: (d: Record<string, unknown>) => d?.name, value: (d: Record<string, unknown>) => `${d?.passed}/18 通过` }] } },
  };

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      {/* 页头 */}
      <header className="mb-6">
        <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.16em] text-primary">EVALUATION</div>
        <h1 className="text-2xl font-bold tracking-tight">实验评测</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          对 PyTorch 与 PaddlePaddle 的 1,349 个配对算子进行系统分析，并在算子等价性、模型级精度、跨领域鲁棒性三个层面验证方法有效性。
        </p>
      </header>

      {/* 指标条 */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((c) => (
          <div key={c.label} className="top-beam glow-card rounded-xl border border-border bg-card px-5 py-4 shadow-soft-sm">
            <div className="text-xs text-muted-foreground">{c.label}</div>
            <div className="mt-1 text-[28px] font-bold tabular-nums leading-none tracking-tight text-gradient">{c.value}</div>
            <div className="mt-1.5 font-mono text-[10.5px] text-muted-foreground">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* 第一行：不一致分布 + 成功率 */}
      <div className="mb-4 grid gap-4 lg:grid-cols-5">
        <ChartCard title="三类语义不一致分布" icon={AlertTriangle} note="n = 1,349" className="lg:col-span-2">
          <VChart spec={donutSpec as never} style={{ height: 250 }} />
          <ul className="mt-1 space-y-1.5 border-t border-border pt-3">
            {data.inconsistency.map((d) => (
              <li key={d.type} className="text-xs leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">{d.type}</span> · {d.desc}；例：{d.example}
              </li>
            ))}
          </ul>
        </ChartCard>
        <ChartCard title="算子转换成功率" icon={Gauge} note={`n = ${data.conversion.total}，MAE/RMSE 均 < 1×10⁻⁴`} className="lg:col-span-3">
          <VChart spec={convSpec as never} style={{ height: 250 }} />
          <div className="mt-1 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center font-mono text-[11px]">
            {data.conversion.by_type.map((t) => (
              <div key={t.type}>
                <span className="text-muted-foreground">{t.type}</span>
                <div className="mt-0.5 text-foreground">{t.succeeded}/{t.sampled}</div>
                <div className="text-muted-foreground/70">MAE {t.mae}</div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* 第二行：模型对比 + LLM 对比 */}
      <div className="mb-4 grid gap-4 lg:grid-cols-5">
        <ChartCard title="与基线工具的模型级对比" icon={Scale} note={data.model_comparison.note} className="lg:col-span-3">
          <VChart spec={f1Spec as never} style={{ height: 260 }} />
          <p className="mt-1 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
            空白柱表示该方法不支持转换该模型。DenseNet、ShuffleNet 因 dilation 语义不一致、Inception3 因 trunc_normal_
            不一致，仅本方法完成转换。{data.model_comparison.latency_note}。
          </p>
        </ChartCard>
        <ChartCard title="与大语言模型直接转换对比" icon={FlaskConical} note="18 个模型通过数" className="lg:col-span-2">
          <VChart spec={llmSpec as never} style={{ height: 260 }} />
          <p className="mt-1 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
            LLM 能处理语法层面转换，但无法桥接算子语义不一致——ChatGPT-4o 也仅有半数模型通过。
          </p>
        </ChartCard>
      </div>

      {/* 第三行：鲁棒性 + 泛化 */}
      <div className="grid gap-4 lg:grid-cols-5">
        <ChartCard title="跨领域鲁棒性（Metric Gap）" icon={Shuffle} note={data.robustness.note} className="lg:col-span-3">
          <VChart spec={gapSpec as never} style={{ height: 260 }} />
          <p className="mt-1 border-t border-border pt-3 text-xs text-muted-foreground">
            全部领域 Metric Gap &lt; 3.4%，且在各数据集上均优于两个基线。
          </p>
        </ChartCard>
        <ChartCard title="迁移至其他框架对" icon={Layers3} note="各 18 个模型" className="lg:col-span-2">
          <div className="space-y-5 py-2">
            {data.generalization.map((g) => (
              <div key={g.direction}>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="font-mono text-xs">{g.direction}</span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-primary">{g.rate}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                    style={{ width: `${g.rate}%` }}
                  />
                </div>
                <div className="mt-1 font-mono text-[10.5px] text-muted-foreground">
                  {g.success}/{g.total} 模型转换成功
                </div>
              </div>
            ))}
            <p className="border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
              方法的逐层对齐思路不依赖特定目标框架，映射表扩展后即可迁移。
            </p>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
