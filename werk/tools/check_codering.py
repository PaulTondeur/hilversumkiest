#!/usr/bin/env python3
"""Controleer vorm en volledigheid van een codering: check_codering.py <CODEUR> <slug>"""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
codeur, slug = sys.argv[1], sys.argv[2]
basis = json.load(open(ROOT / "data" / "stellingen-basis.json"))
ids = [s["id"] for s in basis]
p = ROOT / "werk" / "codering" / codeur / f"{slug}.json"
d = json.load(open(p))
fout = 0
gezien = {}
for o in d:
    gezien[o.get("id")] = o
    if o.get("id") not in ids:
        print("ONBEKEND id:", o.get("id")); fout += 1; continue
    s = o.get("s")
    if s is not None and s not in (-2, -1, 0, 1, 2):
        print("ONGELDIGE score:", o["id"], s); fout += 1
    if s is None:
        continue
    for k in ("kern", "toelichting", "bron", "soort"):
        if not o.get(k):
            print(f"ONTBREEKT {k}:", o["id"]); fout += 1
    if o.get("soort") not in ("programma", "mijnstem", "stemgids", "hilversumsnieuws", "stemgedrag", "afgeleid"):
        print("ONGELDIGE soort:", o["id"], o.get("soort")); fout += 1
    if o.get("soort") == "afgeleid" and abs(s) == 2:
        print("AFGELEID mag hoogstens ±1 zijn:", o["id"]); fout += 1
    if o.get("soort") in ("programma", "mijnstem", "stemgids", "hilversumsnieuws") and not o.get("citaat"):
        print("ONTBREEKT citaat:", o["id"]); fout += 1
    if o.get("kern") and len(o["kern"].split()) > 16:
        print("KERN te lang:", o["id"]); fout += 1
for i in ids:
    if i not in gezien:
        print("ONTBREEKT stelling:", i); fout += 1
from collections import Counter
c = Counter(str(o.get("s")) for o in d)
print(f"{codeur}/{slug}: {len(d)} stellingen, scores {dict(c)}, {fout} fouten")
sys.exit(1 if fout else 0)
