const API_BASE = "/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail || `API ${res.status}`);
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
  matcher: string;
  has_variant_code: boolean;
  params_change: Record<string, unknown>;
  unsupport_params: unknown[];
}

export const api = {
  stats: () => get<Stats>("/stats"),
  samples: () => get<{ samples: Sample[]; converter_available: boolean }>("/samples"),
  source: (id: string) => get<{ content: string; file: string }>(
    `/source?id=${encodeURIComponent(id)}`,
  ),
  target: (id: string, file?: string) =>
    get<{ content: string; file: string }>(
      `/target?id=${encodeURIComponent(id)}${file ? `&file=${encodeURIComponent(file)}` : ""}`,
    ),
  diff: (id: string) => get<DiffResult>(`/diff?id=${encodeURIComponent(id)}`),
  mapping: (query: string, direction: string, limit = 100) =>
    get<{ total: number; items: MappingItem[] }>(
      `/mapping?query=${encodeURIComponent(query)}&direction=${encodeURIComponent(
        direction,
      )}&limit=${limit}`,
    ),
};
