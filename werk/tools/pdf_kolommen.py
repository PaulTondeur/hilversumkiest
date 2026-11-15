#!/usr/bin/env python3
"""PDF -> tekst in leesvolgorde, kolombewust. Gebruikt `pdftotext -bbox-layout`.
Gebruik: pdf_kolommen.py in.pdf uit.txt"""
import subprocess, sys, re, html
import xml.etree.ElementTree as ET

pdf, out = sys.argv[1], sys.argv[2]
x = subprocess.run(["pdftotext", "-bbox-layout", pdf, "-"], capture_output=True).stdout.decode("utf-8", "replace")
x = re.sub(r'<!DOCTYPE[^>]*>', '', x)
x = re.sub(r'xmlns="[^"]+"', '', x)
root = ET.fromstring(x)
pages = []
for page in root.iter("page"):
    W = float(page.get("width"))
    blocks = []
    for b in page.iter("block"):
        x0, y0, x1, y1 = (float(b.get(k)) for k in ("xMin", "yMin", "xMax", "yMax"))
        lines = []
        for l in b.iter("line"):
            lines.append(" ".join(w.text or "" for w in l.iter("word")))
        txt = "\n".join(lines).strip()
        if txt:
            blocks.append([x0, y0, x1, y1, txt])
    blocks.sort(key=lambda b: (b[1], b[0]))
    # goten zoeken: x-posities die (bijna) geen enkel blok bedekt
    n = len(blocks)
    cov = [0] * (int(W) + 2)
    for bl in blocks:
        for xx in range(max(0, int(bl[0])), min(int(W) + 1, int(bl[2]) + 1)):
            cov[xx] += 1
    lo = min((bl[0] for bl in blocks), default=0); hi = max((bl[2] for bl in blocks), default=W)
    thr = max(1, int(0.04 * n))
    cuts, run = [], None
    for xx in range(int(lo) + 20, int(hi) - 20):
        if cov[xx] <= thr:
            run = [xx, xx] if run is None else [run[0], xx]
        else:
            if run and run[1] - run[0] >= 8: cuts.append((run[0] + run[1]) / 2)
            run = None
    if run and run[1] - run[0] >= 8: cuts.append((run[0] + run[1]) / 2)
    def col(bl):
        c = (bl[0] + bl[2]) / 2
        return sum(1 for k in cuts if c > k)
    def wide(bl):
        return any(bl[0] < k - 6 and bl[2] > k + 6 for k in cuts)
    segs, cur = [], []
    for bl in blocks:
        if wide(bl):
            if cur: segs.append(("cols", cur)); cur = []
            segs.append(("wide", [bl]))
        else:
            cur.append(bl)
    if cur: segs.append(("cols", cur))
    text = []
    for kind, bs in segs:
        if kind == "wide":
            text.append(bs[0][4]); continue
        for bl in sorted(bs, key=lambda bl: (col(bl), bl[1], bl[0])):
            text.append(bl[4])
    pages.append("\n\n".join(text))
open(out, "w", encoding="utf-8").write("\n\f".join(pages) + "\n")
