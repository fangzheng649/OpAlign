"use client";

/**
 * OpAlign 方法流程图（手绘 SVG）
 * 输入 → 算子提取分类 → 三分支处理 → 逐层对齐 → 输出
 */
export default function PipelineFlow() {
  const box =
    "fill-card stroke-[hsl(216,55%,86%)]";
  const title = "fill-[hsl(222,58%,13%)] text-[11.5px] font-semibold";
  const sub = "fill-[hsl(216,20%,44%)] text-[9.5px]";
  const edge = "stroke-[hsl(221,83%,60%)]";

  return (
    <svg viewBox="0 0 760 300" className="w-full" role="img" aria-label="OpAlign 方法流程图">
      <defs>
        <marker id="oa-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0.8 7.2 4 0 7.2z" className="fill-[hsl(221,83%,60%)]" />
        </marker>
        <linearGradient id="oa-branch" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2563eb" />
          <stop offset="1" stopColor="#0891b2" />
        </linearGradient>
      </defs>

      {/* 输入 */}
      <g>
        <rect x="12" y="110" width="128" height="64" rx="10" className={box} strokeWidth="1.2" />
        <text x="76" y="138" textAnchor="middle" className={title}>源框架模型代码</text>
        <text x="76" y="156" textAnchor="middle" className={sub}>PyTorch .py</text>
      </g>
      <path d="M140 142 H182" className={edge} strokeWidth="1.6" markerEnd="url(#oa-arrow)" />

      {/* 算子提取分类 */}
      <g>
        <rect x="186" y="100" width="140" height="84" rx="10" className={box} strokeWidth="1.2" />
        <text x="256" y="126" textAnchor="middle" className={title}>算子提取与分类</text>
        <text x="256" y="143" textAnchor="middle" className={sub}>AST 遍历 · 上下文分析</text>
        <text x="256" y="158" textAnchor="middle" className={sub}>查询映射表判定类型</text>
      </g>

      {/* 三分支连线 */}
      <path d="M326 122 C 366 122 366 52 398 52" className={edge} strokeWidth="1.4" fill="none" markerEnd="url(#oa-arrow)" />
      <path d="M326 142 H398" className={edge} strokeWidth="1.4" markerEnd="url(#oa-arrow)" />
      <path d="M326 162 C 366 162 366 232 398 232" className={edge} strokeWidth="1.4" fill="none" markerEnd="url(#oa-arrow)" />

      {/* 分支一：一致 */}
      <g>
        <rect x="402" y="24" width="150" height="56" rx="10" className={box} strokeWidth="1.2" />
        <rect x="402" y="24" width="4" height="56" rx="2" fill="#94a3b8" />
        <text x="416" y="46" className={title}>一致性算子</text>
        <text x="416" y="62" className={sub}>直接 API 映射改写</text>
      </g>

      {/* 分支二：语义不一致 */}
      <g>
        <rect x="402" y="104" width="150" height="76" rx="10" className={box} strokeWidth="1.2" />
        <rect x="402" y="104" width="4" height="76" rx="2" fill="url(#oa-branch)" />
        <text x="416" y="128" className={title}>语义不一致</text>
        <text x="416" y="144" className={sub}>Python 层源码补丁</text>
        <text x="416" y="159" className={sub}>C 层动态库替换</text>
      </g>

      {/* 分支三：缺失 */}
      <g>
        <rect x="402" y="204" width="150" height="56" rx="10" className={box} strokeWidth="1.2" />
        <rect x="402" y="204" width="4" height="56" rx="2" fill="#38bdf8" />
        <text x="416" y="226" className={title}>算子缺失</text>
        <text x="416" y="242" className={sub}>调用栈追踪 · 等价构建</text>
      </g>

      {/* 汇合 */}
      <path d="M552 52 C 586 52 586 128 612 128" className={edge} strokeWidth="1.4" fill="none" markerEnd="url(#oa-arrow)" />
      <path d="M552 142 H612" className={edge} strokeWidth="1.4" markerEnd="url(#oa-arrow)" />
      <path d="M552 232 C 586 232 586 156 612 156" className={edge} strokeWidth="1.4" fill="none" markerEnd="url(#oa-arrow)" />

      {/* 输出 */}
      <g>
        <rect x="616" y="100" width="132" height="84" rx="10" fill="url(#oa-branch)" />
        <rect x="616" y="100" width="132" height="84" rx="10" fill="white" opacity="0.05" />
        <text x="682" y="130" textAnchor="middle" className="fill-white text-[11.5px] font-semibold">目标框架代码</text>
        <text x="682" y="147" textAnchor="middle" className="fill-white/80 text-[9.5px]">PaddlePaddle .py</text>
        <text x="682" y="162" textAnchor="middle" className="fill-white/80 text-[9.5px]">+ modified_*.py 补丁</text>
      </g>
    </svg>
  );
}
