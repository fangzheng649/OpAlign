const API_BASE = "/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail || `API ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || `API ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface Sample {
  id: string;
  framework: string;
  domain: string;
  name: string;
  has_target: boolean;
  target_files: string[];
  patches: string[];
}

export interface Stats {
  mappings: Record<
    string,
    { total: number; matchers: Record<string, number>; variant_code: number }
  >;
  sample_total: number;
  sample_with_target: number;
  converter_available: boolean;
}

export interface DiffOp {
  tag: "replace" | "delete" | "insert";
  a1: number;
  a2: number;
  b1: number;
  b2: number;
}

export interface DiffResult {
  ops: DiffOp[];
  similarity: number;
  src_lines: number;
  tgt_lines: number;
}

export interface MappingItem {
  source_api: string;
  target_api: string;
  auto_resolved: boolean;
  matcher: string;
  has_variant_code: boolean;
  params_change: Record<string, unknown>;
  unsupport_params: unknown[];
}

export interface ResultsData {
  overview: {
    analyzed_operators: number;
    semantic_attention_ratio: number;
    conversion_success_rate: number;
    robustness_models: number;
  };
  inconsistency: { type: string; count: number; ratio: number; desc: string; example: string }[];
  layer_distribution: { layer: string; ratio: number; note: string }[];
  conversion: {
    total: number;
    success: number;
    by_type: { type: string; sampled: number; succeeded: number; rate: number; mae: string; rmse: string }[];
  };
  model_comparison: {
    note: string;
    rows: { model: string; onnx: number | null; paconvert: number | null; ours: number | null; note: string }[];
    latency_note: string;
  };
  llm_comparison: { name: string; passed: number; total: number; note: string }[];
  robustness: {
    note: string;
    rows: { domain: string; dataset: string; ours: number; onnx: number; paconvert: number }[];
  };
  generalization: { direction: string; total: number; success: number; rate: number }[];
}

export const api = {
  stats: () => get<Stats>("/stats"),
  results: () => get<ResultsData>("/results"),
  samples: () => get<{ samples: Sample[]; converter_available: boolean }>("/samples"),
  source: (id: string) => get<{ content: string; file: string }>(
    `/source?id=${encodeURIComponent(id)}`,
  ),
  target: (id: string, file?: string) =>
    get<{ content: string; file: string }>(
      `/target?id=${encodeURIComponent(id)}${file ? `&file=${encodeURIComponent(file)}` : ""}`,
    ),
  diff: (id: string) => get<DiffResult>(`/diff?id=${encodeURIComponent(id)}`),
  convert: (sampleId: string) => post<{ task_id: string }>("/convert", { sample_id: sampleId }),
  taskStatus: (taskId: string) => get<{ status: string; message: string; error?: string; out_files?: string[] }>(
    `/task/${taskId}`,
  ),
  taskFile: (taskId: string, name: string) =>
    get<{ content: string; file: string }>(
      `/task/${taskId}/file?name=${encodeURIComponent(name)}`,
    ),
  taskDiff: (taskId: string) =>
    get<DiffResult & { file: string }>(`/task/${taskId}/diff`),
  mapping: (query: string, direction: string, limit = 100) =>
    get<{ total: number; items: MappingItem[] }>(
      `/mapping?query=${encodeURIComponent(query)}&direction=${encodeURIComponent(
        direction,
      )}&limit=${limit}`,
    ),
};
