"""The Knowledge cases' fake ingest run (fake-claude.sh): in its working folder — a copy of a made-up vault — it makes
the edits a scenario names, then prints one made-up `result` line as Claude Code's last stream line.

    python3 -I fake_ingest.py <dir>/fake-ingest.json

The scenario: {"write": {path: text}, "append": {path: text}, "rows": [[index, heading, row]], "changes": {...},
"answer": text, "cost": n}. Paths are relative to the copy (never `..`, never absolute); `rows` puts a table row at the
end of the table under `## <heading>`; `changes` becomes `.echo-ingest/changes.json`. No scenario: nothing changes.
"""
import json
import os
import sys


def inside(rel):
    if os.path.isabs(rel) or ".." in rel.split("/") or not rel:
        sys.exit(f"fake ingest: {rel!r} isn't a path inside the copy")
    return rel


def main():
    try:
        with open(sys.argv[1], encoding="utf-8") as f:
            s = json.load(f)
    except OSError:
        s = {}
    for rel, text in (s.get("write") or {}).items():
        os.makedirs(os.path.dirname(inside(rel)) or ".", exist_ok=True)
        with open(rel, "w", encoding="utf-8") as f:
            f.write(text)
    for rel, text in (s.get("append") or {}).items():
        with open(inside(rel), "a", encoding="utf-8") as f:
            f.write(text)
    for index, heading, row in s.get("rows") or []:
        with open(inside(index), encoding="utf-8") as f:
            lines = f.read().split("\n")
        at = next(i for i, l in enumerate(lines) if l.strip().lstrip("#").strip() == heading)
        last = at
        for i in range(at + 1, len(lines)):
            if lines[i].lstrip().startswith("#"):
                break
            if lines[i].lstrip().startswith("|"):
                last = i
        lines.insert(last + 1, row)
        with open(index, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
    if s.get("changes") is not None:
        os.makedirs(".echo-ingest", exist_ok=True)
        with open(".echo-ingest/changes.json", "w", encoding="utf-8") as f:
            json.dump(s["changes"], f)
    print(json.dumps({"type": "result", "subtype": "success", "is_error": False, "result": s.get("answer", "Nothing to change."),
                      "total_cost_usd": s.get("cost", 0.42), "duration_ms": 900, "num_turns": 3,
                      "usage": {"input_tokens": 1200, "output_tokens": 300, "cache_read_input_tokens": 0, "cache_creation_input_tokens": 0}}))


main()
