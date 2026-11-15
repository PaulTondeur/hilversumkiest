#!/usr/bin/env python3
"""Controleer dat citaten letterlijk in de bronteksten van een partij staan.

Gebruik:
  check_citaten.py <slug>                 controleert bronnen/<slug>/digest.json
  check_citaten.py <slug> <bestand.json>  controleert elk object met een 'citaat'-veld
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKC", s)
    s = s.replace("­", "")
    s = re.sub(r"[‘’‚`´]", "'", s)
    s = re.sub(r"[“”„]", '"', s)
    s = re.sub(r"[–—−]", "-", s)
    # afbreekstreepje aan regeleinde: "wo-\nnen" -> "wonen"
    s = re.sub(r"(\w)-\s*\n\s*(\w)", r"\1\2", s)
    s = re.sub(r"[•●▪◦■]", " ", s)
    s = re.sub(r"\s+", " ", s)
    return s.strip().lower()


def squash(s: str) -> str:
    """Nog losser: alleen letters en cijfers."""
    return re.sub(r"[^0-9a-zà-ÿ]", "", norm(s))


def lig(s: str) -> str:
    """Nog losser: ligaturen fi/fl/ff vallen samen met f (kapotte pdf-tekstlagen)."""
    return re.sub(r"f[fil]+", "f", squash(s))


def load_sources(slug: str):
    d = ROOT / "bronnen" / slug
    out = {}
    for p in sorted(d.glob("*.txt")):
        t = p.read_text(encoding="utf-8", errors="replace")
        out[p.name] = (norm(t), squash(t), lig(t))
    return out


def walk(o):
    if isinstance(o, dict):
        if isinstance(o.get("citaat"), str):
            yield o
        for v in o.values():
            yield from walk(v)
    elif isinstance(o, list):
        for v in o:
            yield from walk(v)


def check(slug: str, path: Path) -> int:
    src = load_sources(slug)
    if not src:
        print(f"GEEN BRONTEKST voor {slug}")
        return 1
    data = json.loads(path.read_text(encoding="utf-8"))
    n = bad = 0
    for item in walk(data):
        c = item["citaat"].strip()
        if not c:
            continue
        n += 1
        # sta "..." / "…" toe als scheiding tussen letterlijke delen
        parts = [p for p in re.split(r"\s*(?:\[\.\.\.\]|\(\.\.\.\)|…|\.\.\.)\s*", c) if len(p.strip()) > 8]
        ok = True
        for part in parts or [c]:
            a, b, g = norm(part), squash(part), lig(part)
            if not any(a in s[0] or (len(b) > 20 and b in s[1]) or (len(g) > 20 and g in s[2]) for s in src.values()):
                ok = False
                break
        if not ok:
            bad += 1
            label = item.get("onderwerp") or item.get("stelling") or item.get("id") or ""
            print(f"NIET GEVONDEN [{label}]: {c[:160]}")
    print(f"{slug}: {n} citaten, {bad} niet letterlijk gevonden")
    return 1 if bad else 0


if __name__ == "__main__":
    slug = sys.argv[1]
    path = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "bronnen" / slug / "digest.json"
    sys.exit(check(slug, path))
