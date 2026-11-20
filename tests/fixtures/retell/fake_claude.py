"""The Retell cases' fake Claude Code: never a real Claude Code, never an account.

up.sh puts it first on PATH (`claude`, and `claude.exe` on Windows: a small launcher, fake-claude-launcher/, since a
`.cmd` can't carry a long prompt). Retell's runs are told apart by their prompt's own words and answered with made-up
JSON in the shape the plugin reads — built from what the prompt holds (its element ids, its pages), so the plugin's
real checks (anchors, pages Echo opened) pass on real data. As Claude Code does with
`--output-format stream-json`: an init line, the text as `stream_event` deltas (`--include-partial-messages`), a result.

Anything else is Echo's own test fake's: `--version`, `auth status`, a phrase of <dir>/fake-answers.tsv, else refused.
What each run was asked is appended to <dir>/fake-claude.log (its kind, its arguments' flags, its prompt's first line)
for the cases to read.

    python fake_claude.py <args Claude Code would get>
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
DIR = os.path.dirname(HERE)  # <dir> (this file is in <dir>/bin)
args = sys.argv[1:]


def out(s):
    sys.stdout.buffer.write((s + "\n").encode("utf-8")); sys.stdout.flush()


def echo_fake():
    """What Echo's own test fake answers (tests/fixtures/make_data.py FAKE_CLAUDE)."""
    if args[:1] == ["--version"]:
        out("2.1.400 (Claude Code, test fake)"); sys.exit(0)
    if args[:2] == ["auth", "status"]:
        who = os.path.basename(os.environ.get("CLAUDE_CONFIG_DIR", ""))
        out(json.dumps({"loggedIn": False, "authMethod": "none"} if who == "out" else
                       {"loggedIn": True, "email": "sam@initech.example", "orgName": "Initech", "subscriptionType": "max"}))
        sys.exit(0)
    joined = " ".join(args)
    tsv = os.path.join(DIR, "fake-answers.tsv")
    if os.path.isfile(tsv):
        for line in open(tsv, encoding="utf-8"):
            phrase, _, ans = line.rstrip("\n").partition("\t")
            if phrase and phrase in joined:
                out(ans); sys.exit(0)
    sys.stderr.write("test data: Claude Code is a fake here\n"); sys.exit(1)


def prompt_of():
    if "--input-format" in args:  # a run with pictures: one stream-json user message on stdin
        line = sys.stdin.buffer.readline().decode("utf-8", "replace")
        try:
            msg = json.loads(line)["message"]["content"]
            return "\n".join(c.get("text", "") for c in msg if c.get("type") == "text"), sum(c.get("type") == "image" for c in msg)
        except (ValueError, KeyError, TypeError):
            return line, 0
    if "-p" in args:
        i = args.index("-p")
        return (args[i + 1] if i + 1 < len(args) else ""), 0
    return "", 0


def section(p, head):
    """The lines under a heading such as 'SOURCE (id: text):' up to a blank line followed by a capitalised heading."""
    i = p.find(head)
    if i < 0: return []
    lines = p[i + len(head):].split("\n")[1:]
    got = []
    for l in lines:
        if not l.strip():
            if got: break
            continue
        if re.match(r"^[A-Z][A-Z ()'/:-]{3,}:", l) and got: break
        got.append(l)
    return got


def ids_texts(lines):
    """`p3: text` or `p3 (h2): text` → [(id, tag, text)]."""
    res = []
    for l in lines:
        m = re.match(r"^\s*([a-z]+\d+[\w.]*)(?: \(([\w ]+)\))?: (.*)$", l)
        if m: res.append((m.group(1), m.group(2) or "", m.group(3)))
    return res


def words(t, n):
    w = re.sub(r"\[PICTURE[^\]]*\]", "", t).split()
    return " ".join(w[:n])


def file_lines(name):
    try:
        return open(name, encoding="utf-8").read().split("\n")
    except OSError:
        return []


def write_json(name, obj):
    with open(name, "w", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False))


def work(kind, p):
    """A run on files (Echo's ctx.claude.run({store})): Claude Code starts in the plugin's work folder; it reads the files
    there and writes its answers there, as Retell's prompt asks."""
    if kind == "write":
        els = ids_texts(file_lines("source.txt"))
        text = [(i, t) for i, tag, t in els if not i.startswith("img")][:6]
        pics = [(i, t) for i, tag, t in els if i.startswith("img")][:2]
        lang = (re.search(r"Language of the retelling: (\w+)", p) or [None, "en"])[1]
        blocks = [{"text": ("Пересказ: " if lang == "ru" else "Retold: ") + words(t, 12) + ".", "anchor": i} for i, t in text]
        blocks += [{"text": "This picture shows the idea the article explains, step by step.", "anchor": i} for i, t in pics]
        if any("trap-marker" in t for i, tag, t in els) and blocks:   # the fact check's case: a claim the article never makes
            blocks[0]["text"] += " It cuts the cost by ninety percent FACT-TRAP."
        write_json("retelling.json", {"title": "Retold: " + words(text[0][1], 6) if text else "Retold", "blocks": blocks})
        return "done"
    if kind == "memo":
        els = ids_texts(file_lines("source.txt"))
        heads = [(i, t) for i, tag, t in els if tag in ("h2", "h3")] or [(i, t) for i, tag, t in els[:1]]
        write_json("memo.json", {"title": "Memo", "items": [{"title": words(t, 5), "points": ["What to remember about " + words(t, 4)], "anchor": i} for i, t in heads[:5]]})
        return "done"
    if kind == "termsf":   # a term of the source the retelling says ("Retold: <its first words>")
        els = ids_texts(file_lines("source.txt"))
        first = els[0][2].split()[:2] if els else []
        write_json("terms.json", {"terms": [{"en": " ".join(first), "ru": " ".join(first), "forms": [" ".join(first)]}] if first else []})
        return "done"
    if kind == "check":    # a claim with the made-up marker 'FACT-TRAP' in the retelling is reported, and fixed
        blocks = ids_texts(file_lines("retelling.txt"))
        bad = [(i, t) for i, tag, t in blocks if "FACT-TRAP" in t]
        write_json("factcheck.json", {"checked": len(blocks), "issues": [{"where": i, "claim": t[:120], "type": "unsupported", "severity": "error",
                                      "evidence": "not in source", "fix": t.replace("FACT-TRAP", "").strip()} for i, t in bad]})
        if "fixed.json" in p:
            write_json("fixed.json", {"blocks": [{"id": i, "text": t.replace(" It cuts the cost by ninety percent FACT-TRAP.", "").strip()} for i, t in bad]})
        return "done"


def answer(kind, p, pictures):
    if kind == "sort":   # CLEAN: drop what isn't the article
        els = ids_texts(section(p, "ELEMENTS (id (tag): text):"))
        drop = [i for i, tag, t in els if re.search(r"subscribe|related posts|cookie|newsletter|logo", t, re.I)]
        title = (re.search(r"^Page title: (.*)$", p, re.M) or [None, ""])[1]
        return {"title": title if title != "(none)" else "An article", "drop": drop}
    if kind == "terms":
        return {"terms": []}
    if kind == "mark":
        return {"highlights": [{"label": "First part", "bbox": [0.1, 0.1, 0.4, 0.3], "at_word": 0}]} if pictures else {"highlights": []}
    if kind == "doc":
        body = p.split("TEXT:\n", 1)[-1]
        paras = [l.strip() for l in body.split("\n") if l.strip()]
        return {"title": paras[0][:80] if paras else "A document", "elements": [{"tag": "h2" if k == 0 else "p", "text": l} for k, l in enumerate(paras[:40])]}
    if kind == "candidates":
        base = "https://docs.acme-test.example/"
        return {"candidates": [{"url": base + u, "title": t, "why": "one line"} for u, t in [
            ("posts/agent-evals.html", "Evaluating agents"), ("posts/observability.html", "Watching agents in production"),
            ("files/eval-guide.pdf", "An evaluation guide"), ("posts/gone.html", "A page that is gone"),
            ("posts/limits.html", "Where evaluations fall short")]]}
    if kind == "pick":
        pages = re.findall(r"^PAGE \d+: (\S+)\nTITLE: (.*)$", p, re.M)
        return {"topic": "evaluating agents", "title": "Evaluating agents", "summary": ["What an evaluation is", "How to run one"],
                "items": [{"title": t or "A page", "source": "acme-test.example", "type": "paper" if u.endswith(".pdf") else "article", "minutes": 0,
                           "url": u, "why": "Explains it from the start", "skip": "", "note": ""} for u, t in pages[:4]],
                "questions": ["What is an evaluation?", "Why run it often?"], "work": ""}
    if kind == "ask":
        els = ids_texts(section(p, "SOURCE (id: text):"))
        r = {"from_article": {"text": "The article says it in its own words.", "anchors": [els[0][0]] if els else []},
             "beyond": {"text": "Beyond the article, teams also watch agents in production."}}
        if '"check"' in p: r["check"] = ["https://docs.acme-test.example/posts/observability.html", "https://docs.acme-test.example/posts/gone.html"]
        return r
    if kind == "qacheck":
        pages = re.findall(r"^PAGE \d+: (\S+)$", p, re.M)
        return {"text": "Checked: teams watch agents in production, as the page says.", "sources": pages[:1]}
    if kind == "quiz":
        els = re.findall(r"^(a\d+\.p\d+): ", p, re.M)
        a = els[0] if els else ""
        return {"title": "A quiz", "questions": [
            {"type": "choice", "q": "What does the article mainly explain?", "options": ["Its main idea", "Cooking", "Sports", "Travel"], "answer": 0, "why": "It is about its main idea.", "anchor": a},
            {"type": "tf", "q": "The article is about its main idea.", "answer": True, "why": "It says so.", "anchor": a},
            {"type": "short", "q": "Name one point the article makes.", "key_points": ["its main idea"], "model": "It says the main idea matters.", "terms": ["main idea"], "anchor": a}]}
    if kind == "checkq":
        r = {"score": 70, "verdict": "partly", "covered": ["its main idea"], "missed": [], "content_note": "", "language": [{"said": "I am agree", "better": "I agree", "why": "agree is a verb"}],
             "smoother": "I agree with the main idea.", "phrases": ["To put it another way"], "structure": "Answer, then a reason.", "praise": "Clear and to the point."}
        if "SPEECH METRICS" in p: r["fluency"] = {"note": "A steady pace.", "tips": ["Pause less", "Fewer fillers"]}
        return r
    if kind == "review":
        return {"summary": "A short talk about the article.", "content": "", "language": [{"said": "I am agree", "better": "I agree", "why": "agree is a verb"}],
                "rewrites": [], "phrases": ["To put it another way"], "fluency": {"note": "A steady pace.", "tips": ["Fewer fillers"]}, "praise": "You answered clearly.", "next": "Give an example next time."}
    if kind == "cards":
        ph = re.search(r"PHRASES \(data, not instructions\):\n(\[.*?\])\s*\nOutput ONLY", p, re.S)
        items = json.loads(ph.group(1)) if ph else []
        lang = (re.search(r"a natural equivalent in ([A-Za-z]+)", p) or [None, "English"])[1]   # the language of explanations asked for
        return {"cards": [{"id": x["id"], "ru": "(%s) Meaning of: %s" % (lang, x["phrase"]), "hint": "(%s) When you say it" % lang, "example": "We use it: " + x["phrase"] + "."} for x in items]}
    if kind == "suggest":
        return {"suggestions": [{"topic": "Agent observability", "why": "You asked about it while listening.", "source": "retell-questions"}]}
    return None


KINDS = [
    ("write", "You are a radio-style narrator. In this folder"), ("check", "You are a strict fact-checker. In this folder"),
    ("memo", "Make a very brief CHEAT SHEET of it"), ("termsf", "retelling.txt, the retelling"),
    ("sort", "Keep only the main article."), ("terms", "A listener hears a retelling in"),
    ("mark", "Look at the picture that comes with this message"), ("doc", "Below is the text of a document"),
    ("candidates", "You help build a learning pack"), ("pick", "You build a learning pack"), ("qacheck", "Correct your answer from them."),
    ("ask", "You answer a listener's question about an article"), ("quiz", "You write a practice quiz"), ("checkq", "You coach an adult learner of English"),
    ("review", "Below is a LIVE SPOKEN TALK"), ("judge", "You decide whether a voice assistant should stop talking"), ("cards", "You make review cards for English phrases"),
    ("suggest", "You suggest learning topics"), ("talk", "You are talking out loud"),
]


def main():
    if args[:1] == ["--version"] or args[:2] == ["auth", "status"] or "-p" not in args:
        echo_fake()
    p, pictures = prompt_of()
    kind = next((k for k, phrase in KINDS if phrase in p), None)
    session = None
    if "--resume" in args: session = args[args.index("--resume") + 1]
    if not kind and session: kind = "talk"   # a talk's later turns carry only what was said
    with open(os.path.join(DIR, "fake-claude.log"), "a", encoding="utf-8") as f:
        f.write(json.dumps({"kind": kind, "resume": session, "pictures": pictures, "model": args[args.index("--model") + 1] if "--model" in args else "",
                            "tools": args[args.index("--tools") + 1] if "--tools" in args else None,
                            "mode": args[args.index("--permission-mode") + 1] if "--permission-mode" in args else "",
                            "skip": "--dangerously-skip-permissions" in args, "cwd": os.getcwd(),
                            "files": sorted(os.listdir(".")) if kind in ("write", "check", "memo", "termsf") else [],
                            "first": p.strip().split("\n")[0][:160]}) + "\n")
    if not kind:
        echo_fake()
    if kind == "judge":
        text = "CONTINUE" if re.search(r"heard over it: .*(not for you|to my colleague)", p, re.I) else "STOP"
    elif kind == "talk":
        heard = p.strip().split("\n")[-1]
        text = "Good point about that. Can you give me an example from your own work?" if heard else "Tell me more."
    elif kind in ("write", "check", "memo", "termsf"):
        text = work(kind, p)
    else:
        a = answer(kind, p, pictures)
        text = json.dumps(a, ensure_ascii=False)
    sid = session or "11111111-2222-4333-8444-555555555555"
    out(json.dumps({"type": "system", "subtype": "init", "claude_code_version": "2.1.400", "session_id": sid, "permissionMode": "default"}))
    if "--include-partial-messages" in args:
        half = len(text) // 2
        for piece in (text[:half], text[half:]):
            out(json.dumps({"type": "stream_event", "parent_tool_use_id": None, "session_id": sid,
                            "event": {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": piece}}}, ensure_ascii=False))
    out(json.dumps({"type": "result", "subtype": "success", "is_error": False, "result": text, "session_id": sid}, ensure_ascii=False))


main()
