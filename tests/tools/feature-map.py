#!/usr/bin/env python3
"""The plugins' functional maps against their cases (as Echo's tests/tools/feature-map.py, for this repository).

    python3 -I tests/tools/feature-map.py check      # exit 1 on a problem
    python3 -I tests/tools/feature-map.py coverage   # per feature: its agent and person cases

A map is tests/feature-map/<plugin>.json: {plugin, prefix, features: [{id, title, priority, check: agent|person}]}.
A case is tests/cases/<plugin>/TC-NNN_<slug>.md with frontmatter (id, title, priority, type, requirements, module,
run: agent|person, platform, data, tags). Problems: a case naming a feature no map has, a feature with no case, a
duplicate id, a case without the fields, a case id that doesn't match its file name.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FIELDS = ["id", "title", "priority", "type", "requirements", "module", "run", "platform"]


def front(path):
    text = path.read_text(encoding="utf-8")
    m = re.match(r"---\n(.*?)\n---\n", text, re.S)
    if not m:
        return None
    out = {}
    for line in m.group(1).splitlines():
        k, _, v = line.partition(":")
        v = v.strip()
        if v.startswith("[") and v.endswith("]"):
            v = [x.strip() for x in v[1:-1].split(",") if x.strip()]
        out[k.strip()] = v
    return out


def load():
    features, problems = {}, []
    for f in sorted((ROOT / "tests/feature-map").glob("*.json")):
        m = json.loads(f.read_text(encoding="utf-8"))
        for feat in m["features"]:
            if feat["id"] in features:
                problems.append(f"{f.name}: {feat['id']} twice")
            if not feat["id"].startswith(m["prefix"] + "-"):
                problems.append(f"{f.name}: {feat['id']} doesn't start with {m['prefix']}-")
            if feat.get("check") not in ("agent", "person"):
                problems.append(f"{f.name}: {feat['id']} check is agent or person")
            features[feat["id"]] = {**feat, "plugin": m["plugin"], "agent": [], "person": []}
    cases = {}
    for c in sorted((ROOT / "tests/cases").glob("*/TC-*.md")):
        fm = front(c)
        rel = c.relative_to(ROOT)
        if fm is None:
            problems.append(f"{rel}: no frontmatter")
            continue
        missing = [k for k in FIELDS if k not in fm]
        if missing:
            problems.append(f"{rel}: missing {', '.join(missing)}")
            continue
        if not c.name.startswith(fm["id"] + "_"):
            problems.append(f"{rel}: id {fm['id']} doesn't match the file name")
        key = (c.parent.name, fm["id"])
        if key in cases:
            problems.append(f"{rel}: {fm['id']} twice in {c.parent.name}")
        cases[key] = rel
        if fm["run"] not in ("agent", "person"):
            problems.append(f"{rel}: run is agent or person")
            continue
        for r in fm["requirements"]:
            if r not in features:
                problems.append(f"{rel}: {r} is in no map")
            else:
                features[r][fm["run"]].append(fm["id"])
    for fid, f in features.items():
        if not f["agent"] and not f["person"]:
            problems.append(f"{fid} ({f['plugin']}): no case")
    return features, problems


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "check"
    features, problems = load()
    if cmd == "coverage":
        for fid, f in features.items():
            print(f"{fid:9} {f['priority']:8} agent: {', '.join(f['agent']) or '—':24} person: {', '.join(f['person']) or '—':10} {f['title'][:70]}")
    for p in problems:
        print(p, file=sys.stderr)
    if cmd == "check" and not problems:
        print(f"{len(features)} features, all with cases")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
