#!/usr/bin/env python3
"""A fake GitHub for the GitHub plugin's functional cases: made-up data only (acme-test, acme-labs, ada-acme).

    python3 -I fake_github.py <port> <state.json>

Answers what the plugin asks (POST /graphql: its `query GitHub` and `query Discover`) from <state.json>, which a case
changes while it runs:

    curl -s -X POST http://127.0.0.1:<port>/_state -d '{"repos": {"acme-test/api": {"ci": "SUCCESS"}}}'

/_state merges the JSON it is given into the state (dicts merged, the rest replaced) and answers the whole state; GET
/_state answers it too. /_log lists the requests seen (method, path, the query's name) — to show nothing was asked.
State keys: token (the one it accepts), down (answer 502), rate_remaining, viewer, orgs {login: name}, repos
{owner/name: {ci, failing: [workflow names], prs, issues, pushed, pulls: [{number, title, draft}], open_issues:
[{number, title, due}]}}, reviews [owner/name, …] (the widgets' count), and for the work query: review_requests
[{repo, number, title}], my_prs [{repo, number, title, decision, checks}], assigned [{repo, number, title, due}].
Echo reaches it through its debug-only ECHOCTL_TEST_HOSTS (api.github.com=http://127.0.0.1:<port>).
"""
import json
import re
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(sys.argv[1])
STATE = sys.argv[2]
LOG = []


def load():
    with open(STATE, encoding="utf-8") as f:
        return json.load(f)


def save(state):
    with open(STATE, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)


def merge(a, b):
    for k, v in b.items():
        if isinstance(v, dict) and isinstance(a.get(k), dict):
            merge(a[k], v)
        else:
            a[k] = v
    return a


def repo_node(full, r):
    rollup = None
    if r.get("ci") and r["ci"] != "NONE":
        nodes = [{"__typename": "CheckRun", "name": "build", "conclusion": "SUCCESS", "status": "COMPLETED",
                  "checkSuite": {"workflowRun": {"workflow": {"name": "ci"}}}}]
        for wf in r.get("failing", []):
            nodes.append({"__typename": "CheckRun", "name": wf + "-job", "conclusion": "FAILURE", "status": "COMPLETED",
                          "checkSuite": {"workflowRun": {"workflow": {"name": wf}}}})
        rollup = {"state": r["ci"], "contexts": {"nodes": nodes}}
    return {
        "nameWithOwner": full,
        "url": f"https://github.com/{full}",
        "defaultBranchRef": {"name": "main", "target": {"statusCheckRollup": rollup}},
        "pullRequests": {"totalCount": r.get("prs", 0)},
        "issues": {"totalCount": r.get("issues", 0)},
    }


def owned(state, login):
    """An owner's repos, pushed to last first."""
    rs = [(k, v) for k, v in state["repos"].items() if k.split("/")[0].lower() == login.lower()]
    return sorted(rs, key=lambda kv: kv[1].get("pushed", ""), reverse=True)


def gh_url(repo, kind, n):
    return f"https://github.com/{repo}/{kind}/{n}"


def work_answer(state, v):
    """The plugin's `query Work`: the three searches and each thread repo's open PRs and issues (t<i>)."""
    data = {"viewer": {"login": state["viewer"]},
            "rateLimit": {"remaining": state.get("rate_remaining", 4990), "limit": 5000, "resetAt": "2999-01-01T00:00:00Z"}}
    data["rv"] = {"nodes": [{"number": r["number"], "title": r["title"], "url": gh_url(r["repo"], "pull", r["number"]),
                             "repository": {"nameWithOwner": r["repo"]}} for r in state.get("review_requests", [])]}
    data["my"] = {"nodes": [{"number": r["number"], "title": r["title"], "url": gh_url(r["repo"], "pull", r["number"]), "isDraft": False,
                             "reviewDecision": r.get("decision"), "repository": {"nameWithOwner": r["repo"]},
                             "commits": {"nodes": [{"commit": {"statusCheckRollup": {"state": r["checks"]} if r.get("checks") else None}}]}}
                            for r in state.get("my_prs", [])]}
    data["asg"] = {"nodes": [{"number": r["number"], "title": r["title"], "url": gh_url(r["repo"], "issues", r["number"]),
                              "repository": {"nameWithOwner": r["repo"]},
                              "milestone": {"dueOn": r["due"] + "T08:00:00Z"} if r.get("due") else None}
                             for r in state.get("assigned", [])]}
    for key in v:
        m = re.fullmatch(r"to(\d+)", key)
        if not m:
            continue
        i = m.group(1)
        full = f"{v[key]}/{v.get('tn' + i, '')}"
        hit = next(((k, r) for k, r in state["repos"].items() if k.lower() == full.lower()), None)
        if not hit:
            data["t" + i] = None
            continue
        k, r = hit
        data["t" + i] = {"nameWithOwner": k,
                         "pullRequests": {"nodes": [{"number": p["number"], "title": p["title"], "url": gh_url(k, "pull", p["number"]), "isDraft": bool(p.get("draft"))} for p in r.get("pulls", [])]},
                         "issues": {"nodes": [{"number": p["number"], "title": p["title"], "url": gh_url(k, "issues", p["number"]),
                                               "milestone": {"dueOn": p["due"] + "T08:00:00Z"} if p.get("due") else None} for p in r.get("open_issues", [])]}}
    return {"data": data}


def answer(state, body):
    q = body.get("query", "")
    v = body.get("variables") or {}
    data = {"viewer": {"login": state["viewer"]},
            "rateLimit": {"remaining": state.get("rate_remaining", 4990), "limit": 5000, "resetAt": "2999-01-01T00:00:00Z"}}
    errors = []
    if q.startswith("query Work"):
        return work_answer(state, v)
    if q.startswith("query Discover"):
        mine = sorted(state["repos"].items(), key=lambda kv: kv[1].get("pushed", ""), reverse=True)
        data["viewer"] = {
            "login": state["viewer"],
            "organizations": {"nodes": [{"login": o, "name": n, "repositories": {"totalCount": len(owned(state, o))}}
                                        for o, n in state["orgs"].items()]},
            "repositories": {"totalCount": len(mine), "nodes": [{"nameWithOwner": k, "pushedAt": r.get("pushed", "")} for k, r in mine[:30]]},
        }
        return {"data": data}
    reviews = list(state.get("reviews", []))
    data["reviews"] = {"issueCount": len(reviews), "nodes": [{"repository": {"nameWithOwner": x}} for x in reviews]}
    for key in v:
        m = re.fullmatch(r"([onlpi])(\d+)", key)
        if not m:
            continue
        kind, i = m.groups()
        if kind == "o":
            full = f"{v[key]}/{v.get('n' + i, '')}"
            hit = next(((k, r) for k, r in state["repos"].items() if k.lower() == full.lower()), None)
            data["r" + i] = repo_node(*hit) if hit else None
            if not hit:
                errors.append({"type": "NOT_FOUND", "path": ["r" + i], "message": f"Could not resolve to a Repository with the name '{full}'."})
        elif kind == "l":
            rs = owned(state, v[key])
            if not rs and v[key] not in state["orgs"] and v[key] != state["viewer"]:
                data["w" + i] = None
                errors.append({"type": "NOT_FOUND", "path": ["w" + i], "message": f"Could not resolve to a RepositoryOwner with the login of '{v[key]}'."})
            else:
                data["w" + i] = {"login": v[key], "repositories": {"totalCount": len(rs), "nodes": [repo_node(k, r) for k, r in rs[:10]]}}
        elif kind in "pi":
            login = re.match(r"user:(\S+)", v[key]).group(1)
            data[kind + i] = {"issueCount": sum(r.get("prs" if kind == "p" else "issues", 0) for _, r in owned(state, login))}
    for key in v:
        m = re.fullmatch(r"xo(\d+)", key)
        if m:
            i = m.group(1)
            full = f"{v[key]}/{v.get('xn' + i, '')}"
            hit = next(((k, r) for k, r in state["repos"].items() if k.lower() == full.lower()), None)
            data["x" + i] = repo_node(*hit) if hit else None
    if "mine: viewer" in q:
        mine = sorted(state["repos"].items(), key=lambda kv: kv[1].get("pushed", ""), reverse=True)
        data["mine"] = {"repositories": {"nodes": [repo_node(k, r) for k, r in mine[:10]]}}
    out = {"data": data}
    if errors:
        out["errors"] = errors
    return out


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def send(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/_state":
            return self.send(200, load())
        if self.path == "/_log":
            return self.send(200, LOG)
        self.send(404, {"message": "Not Found"})

    def do_POST(self):
        raw = self.rfile.read(int(self.headers.get("Content-Length") or 0)).decode("utf-8") or "{}"
        if self.path == "/_state":
            state = merge(load(), json.loads(raw))
            save(state)
            return self.send(200, state)
        if self.path != "/graphql":
            return self.send(404, {"message": "Not Found"})
        body = json.loads(raw)
        LOG.append({"method": "POST", "path": self.path, "query": (body.get("query", "").split("{")[0].strip())})
        state = load()
        if state.get("down"):
            return self.send(502, {"message": "Server Error"})
        auth = self.headers.get("Authorization", "")
        if auth.lower() != f"bearer {state['token']}".lower():
            return self.send(401, {"message": "Bad credentials"})
        self.send(200, answer(state, body))


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
