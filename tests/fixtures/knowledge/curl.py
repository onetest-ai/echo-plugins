#!/usr/bin/env python3
"""A single synthetic web source; never forwards a request to a real service."""
import json
from pathlib import Path
import re
import sys

if sys.argv[1:] != ["-q", "-sS", "-K", "-"]:
    sys.exit(7)
config = sys.stdin.read()

def value(key):
    match = re.search(r'^' + key + r' = (".*")$', config, re.M)
    return json.loads(match.group(1)) if match else ""

url = value("url")
if url != "https://acme.example/knowledge":
    sys.exit(6)
body = Path(value("output"))
text = "Acme rolls out by region, EU first. The pilot is reviewed before the next region starts. "
html = '<html><head><title>Acme rollout guide</title></head><body><nav>Fixture menu</nav><main><h1>Acme rollout guide</h1>'
html += ''.join('<p>' + text + '</p>' for _ in range(8))
html += '<script>window.webInjected=true</script></main><footer>Fixture footer</footer></body></html>'
body.write_text(html)
print("200\ntext/html; charset=utf-8\n" + url)
