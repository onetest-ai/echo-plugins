#!/usr/bin/env python3
"""A fake web site for the Knowledge plugin's cases (a web page as an Ingest source): made-up pages on 127.0.0.1 only,
never the internet. Usage: fake_web.py <port> [<port>…] [--log <file>]. Each port serves the same site:

  /rollout.html   an article (a title, paragraphs, a list, a table, a picture of this site and one of another host)
  /spa.html       a page that builds itself with JavaScript (nothing to read without running it)
  /moved.html     a redirect (Echo follows none)
  /img/map.png    a made-up PNG
  /_log           what was asked, one line a request (GET), and DELETE /_log empties it

Echo reaches it as a site the user listed (`web_sites`: http://127.0.0.1:<port>) or as the address its box was given
in a development build (`ECHOCTL_ASK_ADDRESS`)."""
import struct
import sys
import threading
import zlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


def png(w=64, h=48):
    raw = b"".join(b"\x00" + bytes([40, 120, 200]) * w for _ in range(h))
    chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")


PNG = png()
ROLLOUT = """<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Acme rollout plan · Acme wiki</title>
<meta name="author" content="Ada Lovelace"><meta property="article:published_time" content="2026-11-02T10:00:00Z"></head>
<body><nav><a href="/">Home</a> · <a href="/teams">Teams</a></nav>
<article><h1>Acme rollout plan</h1>
<p>Acme rolls out by region: the EU first, then the US. The <b>Control Plane</b> ships in May.</p>
<p>Owners: Ada Lovelace (QA) and Sam Rivera (delivery). Not a [[link]] and not *bold*.</p>
<img src="/img/map.png" alt="The regions map">
<img src="https://cdn.acme.example/chart.png" alt="A chart elsewhere">
<ul><li>EU — 1 March</li><li>US — 1 June</li></ul>
<table><tr><th>Region</th><th>Date</th></tr><tr><td>EU</td><td>1 March</td></tr></table>
<script>document.title = 'ran'</script></article>
<footer>© Acme (made up)</footer></body></html>"""
SPA = """<!doctype html><html><head><meta charset="utf-8"><title>Acme app</title></head>
<body><div id="root"></div><script src="/app.js"></script><script>window.boot && window.boot()</script></body></html>"""


def main():
    args = sys.argv[1:]
    log_path = None
    if "--log" in args:
        i = args.index("--log")
        log_path = args[i + 1]
        del args[i:i + 2]
    ports = [int(p) for p in args]
    seen = []
    lock = threading.Lock()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def send(self, code, kind, body, extra=()):
            self.send_response(code)
            self.send_header("Content-Type", kind)
            self.send_header("Content-Length", str(len(body)))
            for k, v in extra:
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            path = self.path.split("?")[0]
            if path != "/_log":
                with lock:
                    line = f"{self.server.server_port} GET {path} {self.headers.get('User-Agent', '')}"
                    seen.append(line)
                    if log_path:
                        with open(log_path, "a", encoding="utf-8") as f:
                            f.write(line + "\n")
            if path == "/_log":
                with lock:
                    return self.send(200, "text/plain; charset=utf-8", ("\n".join(seen) + "\n").encode())
            if path == "/rollout.html":
                return self.send(200, "text/html; charset=utf-8", ROLLOUT.encode())
            if path == "/spa.html":
                return self.send(200, "text/html; charset=utf-8", SPA.encode())
            if path == "/moved.html":
                return self.send(302, "text/html", b"", [("Location", "/rollout.html")])
            if path == "/img/map.png":
                return self.send(200, "image/png", PNG)
            return self.send(404, "text/plain", b"not here")

        def do_DELETE(self):
            if self.path == "/_log":
                with lock:
                    seen.clear()
                return self.send(200, "text/plain", b"emptied")
            return self.send(404, "text/plain", b"not here")

    servers = [ThreadingHTTPServer(("127.0.0.1", p), Handler) for p in ports]
    for s in servers[1:]:
        threading.Thread(target=s.serve_forever, daemon=True).start()
    servers[0].serve_forever()


if __name__ == "__main__":
    main()
