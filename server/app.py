"""
OpAlign Web API — FastAPI 后端

提供示例浏览、代码 diff、算子映射查询与（可选的）真实转换执行。
真实转换需要后端环境可导入 PyTorch 与 PaddlePaddle；环境缺失时前端
自动进入演示模式（浏览 EVALUATION 中预置的转换产物）。

启动：
    uvicorn server.app:app --port 8100
"""

import difflib
import threading
import uuid
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = PROJECT_ROOT / "EVALUATION" / "datasets" / "models"
MAPPING_FILES = {
    "pytorch→paddlepaddle": PROJECT_ROOT / "CMC" / "pytorch_to_paddlepaddle.json",
    "paddlepaddle→pytorch": PROJECT_ROOT / "CMC" / "paddlepaddle_to_pytorch.json",
}

app = FastAPI(
    title="OpAlign API",
    description="跨框架模型转换工具（算子语义对齐）Web API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# 工具
# ---------------------------------------------------------------------------

def _safe_read(path: Path, base: Path) -> str:
    """限制读取范围在 base 目录内，防止路径穿越"""
    try:
        resolved = path.resolve()
        resolved.relative_to(base.resolve())
    except ValueError:
        raise HTTPException(status_code=400, detail="非法路径")
    if not resolved.is_file():
        raise HTTPException(status_code=404, detail="文件不存在")
    return resolved.read_text(encoding="utf-8", errors="replace")


def _domain_of(rel_dir: Path) -> str:
    parts = rel_dir.parts  # e.g. ('pytorch', 'vision', 'sourceModels')
    return parts[1] if len(parts) > 1 else ""


def _list_models(framework: str) -> List[dict]:
    """扫描 sourceModels 下的示例模型（单文件与子目录两种形态）"""
    samples = []
    root = MODELS_DIR / framework
    if not root.is_dir():
        return samples
    for domain_dir in sorted(p for p in root.iterdir() if p.is_dir()):
        src_dir = domain_dir / "sourceModels"
        tgt_dir = domain_dir / "targetModels"
        if not src_dir.is_dir():
            continue
        for entry in sorted(src_dir.iterdir()):
            if entry.suffix == ".py" and entry.stem != "__init__":
                stem = entry.stem
            elif entry.is_dir() and any(entry.glob("*.py")) and entry.name != "__pycache__":
                stem = entry.name
            else:
                continue
            # 对应转换产物
            tgt_folder = tgt_dir / stem
            tgt_files = sorted(p.name for p in tgt_folder.glob("*.py")) if tgt_dir.joinpath(stem).is_dir() else []
            patches = [f for f in tgt_files if f.startswith("modified_")]
            samples.append({
                "id": f"{framework}/{domain_dir.name}/{stem}",
                "framework": framework,
                "domain": domain_dir.name,      # vision / text / audio
                "name": stem,
                "has_target": bool(tgt_files),
                "target_files": tgt_files,
                "patches": patches,
            })
    return samples


# ---------------------------------------------------------------------------
# 示例与文件
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/results")
def results():
    """实验评测数据（静态，随仓库发布）"""
    import json
    path = Path(__file__).resolve().parent / "results_data.json"
    return json.loads(path.read_text(encoding="utf-8"))


@app.get("/api/stats")
def stats():
    """首页统计卡片数据"""
    mapping_stats = {}
    for label, path in MAPPING_FILES.items():
        if path.is_file():
            import json
            data = json.loads(path.read_text(encoding="utf-8"))
            rules = {k: v for k, v in data.items() if isinstance(v, dict)}
            matcher_count: Dict[str, int] = {}
            variant = 0
            for api, cfg in rules.items():
                m = cfg.get("Matcher", "unknown")
                matcher_count[m] = matcher_count.get(m, 0) + 1
                if cfg.get("variantCode"):
                    variant += 1
            mapping_stats[label] = {
                "total": len(rules),
                "matchers": matcher_count,
                "variant_code": variant,
            }
    torch_samples = _list_models("pytorch")
    return {
        "mappings": mapping_stats,
        "sample_total": len(torch_samples),
        "sample_with_target": sum(1 for s in torch_samples if s["has_target"]),
        "converter_available": _converter_available(),
    }


def _converter_available() -> bool:
    """检测真实转换所需的重型依赖是否可用（torch/paddle 均需可导入）"""
    try:
        import importlib.util
        return importlib.util.find_spec("torch") is not None and importlib.util.find_spec("paddle") is not None
    except Exception:
        return False


@app.get("/api/samples")
def samples(framework: str = "pytorch"):
    return {"samples": _list_models(framework), "converter_available": _converter_available()}


class FileReq(BaseModel):
    path: str  # 形如 "pytorch/vision/densenet"（示例）或带文件名


@app.get("/api/source")
def source_file(id: str, file: Optional[str] = None):
    """读取示例源码。id=pytorch/vision/densenet；目录型示例可指定 file"""
    framework, domain, name = _parse_id(id)
    src_dir = MODELS_DIR / framework / domain / "sourceModels" / name
    path = src_dir / file if file else (src_dir if src_dir.is_dir() else src_dir.with_suffix(".py"))
    if path.is_dir():
        files = sorted(p.name for p in path.glob("*.py"))
        path = path / (files[0] if files else "__init__.py")
    return {"content": _safe_read(path, MODELS_DIR), "file": path.name}


@app.get("/api/target")
def target_file(id: str, file: Optional[str] = None):
    """读取示例的转换产物。缺省取主产物，file 可指定补丁文件"""
    framework, domain, name = _parse_id(id)
    tgt_dir = MODELS_DIR / framework / domain / "targetModels" / name
    if not tgt_dir.is_dir():
        raise HTTPException(status_code=404, detail="该示例暂无预置转换产物")
    if file:
        path = tgt_dir / file
    else:
        cands = [p for p in sorted(tgt_dir.glob("*.py")) if not p.name.startswith("modified_")]
        if not cands:
            raise HTTPException(status_code=404, detail="未找到主产物文件")
        path = cands[0]
    return {"content": _safe_read(path, MODELS_DIR), "file": path.name}


def _parse_id(id: str):
    parts = [p for p in id.split("/") if p and p not in (".", "..")]
    if len(parts) != 3:
        raise HTTPException(status_code=400, detail="id 格式应为 framework/domain/name")
    return parts[0], parts[1], parts[2]


@app.get("/api/diff")
def diff_files(id: str):
    """返回源码与转换产物的行级 diff（sm opcodes）"""
    src = source_file(id)["content"]
    tgt = target_file(id)["content"]
    a, b = src.splitlines(), tgt.splitlines()
    sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
    ops = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag != "equal":
            ops.append({"tag": tag, "a1": i1, "a2": i2, "b1": j1, "b2": j2})
    ratio = sm.ratio()
    return {
        "ops": ops,
        "similarity": round(ratio, 4),
        "src_lines": len(a),
        "tgt_lines": len(b),
    }


# ---------------------------------------------------------------------------
# 算子映射查询
# ---------------------------------------------------------------------------

@app.get("/api/mapping")
def mapping(query: str = "", direction: str = "pytorch→paddlepaddle", limit: int = 50):
    path = MAPPING_FILES.get(direction)
    if path is None or not path.is_file():
        raise HTTPException(status_code=400, detail="不支持的方向")
    import json
    data = json.loads(path.read_text(encoding="utf-8"))
    q = query.strip().lower()
    items = []
    for api, cfg in data.items():
        if not isinstance(cfg, dict):
            continue  # 跳过 _comment 等元数据键
        if q and q not in api.lower() and q not in str(cfg.get("target_api", "")).lower():
            continue
        items.append({
            "source_api": api,
            "target_api": cfg.get("target_api", ""),
            # 多数条目不显式写 target_api：转换器运行时通过框架反射 + 模糊匹配定位目标 API
            "auto_resolved": not cfg.get("target_api"),
            "matcher": cfg.get("Matcher", ""),
            "has_variant_code": bool(cfg.get("variantCode")),
            "params_change": cfg.get("params_change", {}),
            "unsupport_params": cfg.get("unsupport_params", []),
        })
    return {"total": len(items), "items": items[:limit]}


# ---------------------------------------------------------------------------
# 真实转换（可选，需要 torch + paddle 环境）
# ---------------------------------------------------------------------------

tasks: Dict[str, dict] = {}


class ConvertReq(BaseModel):
    sample_id: Optional[str] = None   # 使用预置示例
    code: Optional[str] = None        # 或直接提交代码
    filename: str = "model.py"


@app.post("/api/convert")
def convert(req: ConvertReq):
    if not _converter_available():
        raise HTTPException(
            status_code=503,
            detail="当前后端环境缺少 PyTorch / PaddlePaddle，无法执行真实转换。"
                   "请安装两个框架后重试，或使用演示模式浏览预置转换结果。",
        )
    work_dir = PROJECT_ROOT / "output" / "web" / uuid.uuid4().hex[:8]
    work_dir.mkdir(parents=True, exist_ok=True)
    if req.code is not None:
        (work_dir / req.filename).write_text(req.code, encoding="utf-8")
        in_path = work_dir / req.filename
    elif req.sample_id:
        framework, domain, name = _parse_id(req.sample_id)
        src = MODELS_DIR / framework / domain / "sourceModels" / name
        in_path = src if src.is_dir() else src.with_suffix(".py")
    else:
        raise HTTPException(status_code=400, detail="缺少 sample_id 或 code")

    task_id = uuid.uuid4().hex[:8]
    tasks[task_id] = {
        "status": "pending", "progress": 0, "message": "", "log": "",
        "out_dir": str(work_dir), "sample_id": req.sample_id,
    }

    def worker():
        import subprocess
        tasks[task_id].update(status="running", message="转换执行中")
        log_file = work_dir / "convert.log"
        cmd = [
            sys_exec(), str(PROJECT_ROOT / "main.py"),
            "--in_dir", str(in_path),
            "--out_dir", str(work_dir / "out"),
            "--log_dir", "disable",
        ]
        try:
            with log_file.open("wb") as lf:
                proc = subprocess.run(cmd, cwd=str(PROJECT_ROOT), stdout=lf, stderr=subprocess.STDOUT, timeout=1800)
            log_text = log_file.read_text(encoding="utf-8", errors="replace")
            out_files = [p.name for p in sorted((work_dir / "out").rglob("*.py"))] if (work_dir / "out").is_dir() else []
            tasks[task_id].update(
                status="completed" if proc.returncode == 0 else "failed",
                message="转换完成" if proc.returncode == 0 else f"进程退出码 {proc.returncode}",
                log=log_text[-8000:],
                out_files=out_files,
            )
        except Exception as e:  # noqa: BLE001
            tasks[task_id].update(status="failed", message=str(e))

    threading.Thread(target=worker, daemon=True).start()
    return {"task_id": task_id}


def sys_exec() -> str:
    import sys
    return sys.executable


@app.get("/api/task/{task_id}")
def task_status(task_id: str):
    t = tasks.get(task_id)
    if not t:
        raise HTTPException(status_code=404, detail="任务不存在")
    return t


@app.get("/api/task/{task_id}/file")
def task_file(task_id: str, name: str):
    t = tasks.get(task_id)
    if not t:
        raise HTTPException(status_code=404, detail="任务不存在")
    base = Path(t["out_dir"]) / "out"  # 产物统一写在 out 子目录
    return {"content": _safe_read(base / name, base)}


@app.get("/api/task/{task_id}/diff")
def task_diff(task_id: str):
    """对真实转换任务：计算示例源码与转换主产物的行级 diff"""
    t = tasks.get(task_id)
    if not t:
        raise HTTPException(status_code=404, detail="任务不存在")
    if t.get("status") != "completed":
        raise HTTPException(status_code=400, detail="任务尚未完成")
    out_files = [f for f in t.get("out_files", []) if not f.startswith("modified_")]
    if not out_files:
        raise HTTPException(status_code=404, detail="任务没有主产物文件")
    src = source_file(t["sample_id"])["content"]
    base = Path(t["out_dir"]) / "out"
    tgt = _safe_read(base / out_files[0], base)
    a, b = src.splitlines(), tgt.splitlines()
    sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
    ops = [
        {"tag": tag, "a1": i1, "a2": i2, "b1": j1, "b2": j2}
        for tag, i1, i2, j1, j2 in sm.get_opcodes()
        if tag != "equal"
    ]
    return {"ops": ops, "similarity": round(sm.ratio(), 4),
            "src_lines": len(a), "tgt_lines": len(b), "file": out_files[0]}
