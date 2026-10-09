#!/usr/bin/env python3
"""Conversor Markdown → HTML mínimo (títulos, parágrafos, listas, tabelas, negrito, links, código).
Uso: md2html.py entrada.md saida.html "Título da página"
Sem dependências externas, para gerar docs/privacidade.html a partir de docs/PRIVACIDADE.md.
"""
import html
import re
import sys

STYLE = """
:root{color-scheme:light dark;--bg:#f5f6f8;--fg:#111827;--card:#fff;--line:#e5e7eb;--muted:#6b7280;--brand:#7c3aed}
@media(prefers-color-scheme:dark){:root{--bg:#171b1e;--fg:#e9edef;--card:#1f2428;--line:#313a40;--muted:#aebac1}}
*{box-sizing:border-box}body{margin:0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;background:var(--bg);color:var(--fg);line-height:1.6}
header{background:linear-gradient(135deg,#312e81,#581c87);color:#fff;padding:32px 16px;text-align:center}header a{color:#c7d2fe}
main{max-width:820px;margin:0 auto;padding:24px 16px 64px;background:var(--card)}
h1{font-size:28px}h2{margin-top:32px;border-bottom:1px solid var(--line);padding-bottom:6px}
table{border-collapse:collapse;width:100%;font-size:14px}th,td{border:1px solid var(--line);padding:8px;text-align:left;vertical-align:top}
code{background:var(--bg);padding:2px 5px;border-radius:4px;font-size:90%}a{color:var(--brand)}
footer{text-align:center;color:var(--muted);font-size:13px;padding:24px}
"""


def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"\*([^*]+)\*", r"<em>\1</em>", s)
    s = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', s)
    s = re.sub(r"&lt;(https?://[^&]+)&gt;", r'<a href="\1">\1</a>', s)
    return s


def convert(md):
    out, para, lst, table = [], [], None, None

    def flush_para():
        if para:
            out.append(f"<p>{inline(' '.join(para))}</p>")
            para.clear()

    def flush_list():
        nonlocal lst
        if lst:
            out.append("<ul>" + "".join(f"<li>{inline(i)}</li>" for i in lst) + "</ul>")
            lst = None

    def flush_table():
        nonlocal table
        if table:
            head, *rows = table
            out.append(
                "<table><thead><tr>" + "".join(f"<th>{inline(c)}</th>" for c in head) + "</tr></thead><tbody>"
                + "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in rows)
                + "</tbody></table>"
            )
            table = None

    for line in md.splitlines():
        s = line.rstrip()
        if s.startswith("|"):
            flush_para(); flush_list()
            cells = [c.strip() for c in s.strip("|").split("|")]
            if all(re.fullmatch(r":?-{3,}:?", c) for c in cells):
                continue
            table = (table or []) + [cells]
            continue
        flush_table()
        if not s:
            flush_para(); flush_list()
            continue
        m = re.match(r"^(#{1,6})\s+(.*)", s)
        if m:
            flush_para(); flush_list()
            out.append(f"<h{len(m.group(1))}>{inline(m.group(2))}</h{len(m.group(1))}>")
            continue
        m = re.match(r"^\s*[-*]\s+(.*)", s)
        if m:
            flush_para()
            lst = (lst or []) + [m.group(1)]
            continue
        if s == "---":
            flush_para(); flush_list()
            out.append("<hr>")
            continue
        flush_list()
        para.append(s.strip())
    flush_para(); flush_list(); flush_table()
    return "\n".join(out)


def main():
    src, dst, title = sys.argv[1], sys.argv[2], sys.argv[3]
    body = convert(open(src, encoding="utf-8").read())
    doc = f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)}</title><style>{STYLE}</style></head>
<body><header><strong>Comenta AI</strong> · <a href="/">início</a></header>
<main>{body}</main>
<footer>Comenta AI · projeto independente, não afiliado ao WhatsApp/Meta</footer></body></html>
"""
    open(dst, "w", encoding="utf-8").write(doc)
    print(f"ok: {dst}")


if __name__ == "__main__":
    main()
