#!/usr/bin/env python3
"""批量插入 CloudBase 种子数据 (逐集合, 每条调用 mcporter)"""
import json
import subprocess
import sys
from pathlib import Path

SEED_DIR = Path("/tmp/dy-seed")
ENV_ID = "cloud1-d8gs2k9m311f7272f"

def call(collection, documents):
    docs_json = json.dumps(documents, ensure_ascii=False)
    cmd = [
        "npx", "-y", "mcporter", "call",
        "cloudbase.writeNoSqlDatabaseContent",
        "action=insert",
        f"collectionName={collection}",
        f"documents={docs_json}",
        "--output", "json",
    ]
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=Path.home() / "WorkBuddy" / "zhs-deploy", timeout=120)
    return r.stdout

for f in sorted(SEED_DIR.glob("*.jsonl")):
    collection = f.stem
    docs = []
    for line in f.read_text().splitlines():
        line = line.strip()
        if line:
            docs.append(json.loads(line))
    if not docs:
        continue
    out = call(collection, docs)
    try:
        res = json.loads(out)
        ok = res.get("success")
        cnt = res.get("insertedCount")
        print(f"{collection}: {'OK' if ok else 'FAIL'} ({cnt} inserted)")
        if not ok:
            print("  ", res.get("message") or out[:200])
    except Exception:
        print(f"{collection}: PARSE FAIL")
        print("  ", out[:300])
