"""批量预转换：把无产物的示例全部真实转换一遍，结果进服务端缓存"""
import json
import time
import urllib.request

API = "http://127.0.0.1:8100/api"


def post(path, body):
    req = urllib.request.Request(
        API + path, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"}
    )
    return json.loads(urllib.request.urlopen(req, timeout=30).read())


def get(path):
    return json.loads(urllib.request.urlopen(API + path, timeout=30).read())


def main():
    samples = [s for s in get("/samples")["samples"] if not s["has_target"]]
    print(f"待转换 {len(samples)} 个示例", flush=True)
    for s in samples:
        sid = s["id"]
        try:
            res = post("/convert", {"sample_id": sid})
            if res.get("cached"):
                print(f"[缓存命中] {sid}", flush=True)
                continue
            tid = res["task_id"]
            while True:
                time.sleep(4)
                st = get(f"/task/{tid}")
                if st["status"] in ("completed", "failed"):
                    n = len(st.get("out_files") or [])
                    print(f"[{st['status']}] {sid}  ({n} 个文件) {st.get('message','')}", flush=True)
                    break
        except Exception as e:
            print(f"[请求失败] {sid}: {e}", flush=True)
    print("批量预转换结束", flush=True)


if __name__ == "__main__":
    main()
