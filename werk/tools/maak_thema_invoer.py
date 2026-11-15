#!/usr/bin/env python3
"""Bundel per thema: digest-items van alle lijsten + stemhulp-antwoorden van partijen."""
import json, csv
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
B = ROOT / "bronnen"
THEMAS = ["wonen","verkeer","klimaat","natuur","zorg","veiligheid","asiel","economie","cultuur","bestuur","financien"]
# index in antwoorden.json -> thema('s)
MAP = {0:["verkeer"],1:["economie","wonen"],2:["bestuur"],3:["wonen"],4:["asiel"],5:["economie"],6:["zorg"],7:["wonen","natuur"],
8:["klimaat"],9:["financien"],10:["veiligheid"],11:["verkeer"],12:["wonen","natuur"],13:["klimaat","financien"],14:["veiligheid"],15:["wonen"],
16:["veiligheid"],17:["verkeer"],18:["natuur","economie"],19:["zorg"],20:["klimaat"],21:["verkeer"],22:["economie"],23:["natuur"],24:["bestuur"],
25:["wonen"],26:["asiel","wonen"],27:["wonen"],28:["wonen","economie"],29:["verkeer"],30:["verkeer","klimaat"],31:["verkeer"],32:["financien"],
33:["cultuur","financien"],34:["bestuur"],35:["klimaat"],36:["klimaat"],37:["klimaat"],38:["natuur"],39:["natuur"],40:["asiel"],41:["zorg","financien"],
42:["zorg"],43:["economie"],44:["veiligheid"],45:["economie","wonen"],46:["economie","financien"],47:["bestuur","cultuur"],48:["verkeer"],
49:["wonen","natuur"],50:["verkeer"],51:["bestuur","financien"],52:["asiel"],53:["wonen"],54:["wonen"],55:["wonen"]}
slugs = [r["slug"] for r in csv.DictReader(open(B/"lijsten.tsv"), delimiter="\t")]
ant = json.load(open(B/"_stemhulpen"/"antwoorden.json"))
for t in THEMAS:
    d = ROOT/"werk"/"themas"/t; d.mkdir(parents=True, exist_ok=True)
    items = {}
    for s in slugs:
        p = B/s/"digest.json"
        if not p.exists(): items[s] = None; continue
        dg = json.load(open(p))
        items[s] = [{k: it.get(k) for k in ("onderwerp","standpunt","citaat","bron","pagina","soort")} for it in dg.get("themas",{}).get(t,[])]
    json.dump(items, open(d/"digest-items.json","w"), ensure_ascii=False, indent=1)
    sh = []
    for i, st in enumerate(ant):
        if t in MAP.get(i, []):
            sh.append({"bron": st["bron"], "stelling": st["stelling"], "antwoorden": {a["slug"]: {"antwoord": a["antwoord"], "toelichting": a.get("toelichting"), "herkomst": a.get("herkomst")} for a in st["antwoorden"]}})
    json.dump(sh, open(d/"stemhulpen.json","w"), ensure_ascii=False, indent=1)
    n = sum(len(v) for v in items.values() if v)
    print(t, "digest-items:", n, "lijsten zonder digest:", [s for s,v in items.items() if v is None], "stemhulp-stellingen:", len(sh))
