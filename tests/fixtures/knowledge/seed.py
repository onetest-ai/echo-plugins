#!/usr/bin/env python3
"""Seed only an isolated Echo test environment; reuse Echo's stream-protocol fake."""
import json
import base64
import os
from pathlib import Path
import re
import subprocess
import shutil
import sys

base = Path(sys.argv[1]).resolve()
echo = Path(os.environ["ECHO_REPO"]).resolve()
home = Path(os.environ["ECHOCTL_HOME"]).resolve()
config = Path(os.environ["ECHOCTL_CONFIG_DIR"]).resolve()
default_profile = Path(os.environ["CLAUDE_CONFIG_DIR"]).resolve()
assert all(p.is_relative_to(base) for p in [home, config, default_profile]), "refusing non-test data"
binary = echo / "target/debug/echoctl"

def run(*args):
    return subprocess.run([str(binary), *args], check=True, capture_output=True, text=True).stdout

run("ai", "add-claude", "plugin-test", "--email", "sam@initech.example")
profile = config / "claude/plugin-test"
profile.mkdir(parents=True, exist_ok=True)
(profile / "status.json").write_text(json.dumps({"loggedIn": True, "email": "sam@initech.example", "orgName": "Example Corp", "subscriptionType": "max"}))
source = (echo / "crates/echoctl/src/ai.rs").read_text()
section = source.split("fn install_script(root:", 1)[1]
fake = re.search(r'r#"(#!/bin/sh.*?)"#', section, re.S).group(1)
fake = fake.replace('env > "$d/p.env";', '')
fake = fake.replace('d="$CLAUDE_CONFIG_DIR"\n', '''d="$CLAUDE_CONFIG_DIR"
if [ -t 0 ]; then
  printf 'Simulated vault terminal — no model was contacted.\\n'
  while IFS= read -r input; do
    printf '%s\\n' "$input" >> "$d/terminal-input.txt"
    printf 'Recorded synthetic terminal input.\\n'
  done
  exit 0
fi
''', 1)
launcher = base / "bin/claude"
launcher.write_text(fake)
launcher.chmod(0o755)
shutil.copyfile(Path(__file__).with_name("curl.py"), base / "bin/curl")
(base / "bin/curl").chmod(0o755)
run("ai", "accept", "plugin-test")
vault = base / "vaults/acme-knowledge"
run("knowledge", "new", "Acme knowledge", "--folder", str(vault), "--no-git", "--minutes", "ask")
run("knowledge", "set", "acme-knowledge", "profile", "plugin-test")
pages = vault / "knowledge"
(pages / "clients").mkdir(exist_ok=True)
(pages / "topics").mkdir(exist_ok=True)
(pages / "clients/acme.md").write_text('---\ntitle: Acme\ntags: [client]\n---\n# Acme\n\nAcme rolls out by region, EU first. See [[Rollout]].\n\n![Pixel](../media/pixel.png)\n\n<script>window.knowledgeInjected = true</script>\n')
(pages / "topics/Rollout.md").write_text('---\ntitle: Rollout\ntags: [topic]\n---\n# Rollout\n\nThe EU pilot starts first. See [[acme]].\n')
(pages / "media/pixel.png").write_bytes(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6SAAAAABJRU5ErkJggg=='))
(base / "import").mkdir(exist_ok=True)
(base / "import/selected.md").write_text('# Selected file\n\nAcme rolls out by region, EU first.\n')
connected = base / "vaults/connected-notes"
connected.mkdir(parents=True, exist_ok=True)
(connected / "README.md").write_text('# Connected notes\n\nConnecting this synthetic folder must change nothing.\n')
skill = profile / "skills/fixture-brief/SKILL.md"
skill.parent.mkdir(parents=True, exist_ok=True)
skill.write_text('---\nname: fixture-brief\ndescription: A made-up personal brief skill for plugin validation\n---\nRead the vault and answer briefly.\n')
(vault / "raw_inbox/acme-source.md").write_text('# Acme source\n\nAcme rolls out by region, EU first.\n')
events = [
    {"type": "assistant", "message": {"content": [{"type": "text", "text": "Simulated Claude reply for plugin validation — no model was contacted. Acme rolls out by region, EU first. This reply came through the native guarded Knowledge conversation."}]}},
    {"type": "result", "subtype": "success", "is_error": False, "result": "Done", "usage": {"input_tokens": 20, "output_tokens": 15}},
]
for target in [profile, default_profile]:
    target.mkdir(parents=True, exist_ok=True)
    (target / "chat.jsonl").write_text(''.join(json.dumps(e) + '\n' for e in events))
(profile / "ingest.jsonl").write_text('{"_wait":1}\n{"_apply":1}\n' + json.dumps(events[1]) + '\n')
(profile / "apply.1").write_text('---\ntitle: Prepared finding\ntags: [topic]\n---\n# Prepared finding\n\nAcme rolls out by region, EU first.\n')
(profile / "findings.1.json").write_text(json.dumps({"findings": [
    {"kind": "missing_summary", "title": "Acme needs a summary", "pages": [{"path": "knowledge/clients/acme.md", "quote": "Acme rolls out by region, EU first."}], "fix": {"path": "knowledge/clients/acme.md", "old": "# Acme\n", "new": "# Acme\n\n> Summary: EU rollout first.\n"}},
    {"kind": "missing_summary", "title": "Invented finding must be dropped", "pages": [{"path": "knowledge/clients/acme.md", "quote": "This invented sentence does not occur on the page."}]}
]}))
(profile / "lint.jsonl").write_text('{"_findings":1}\n' + json.dumps(events[1]) + '\n')
(base / "knowledge-fixture.json").write_text(json.dumps({"vault": str(vault), "profile": str(profile), "id": "acme-knowledge"}, indent=2))
print("Seeded synthetic Knowledge vault and fake Claude protocol")
