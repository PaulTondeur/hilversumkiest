# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "pillow"]
# ///
"""Zet de vrije 3D-modellen voor de kaart (trein, zeilboot, hert, eend) om naar het formaat van de kaart.

  uv run tools/kaart/modellen.py

Invoer: de glb-bestanden in bronnen/_kaart/modellen/ (herkomst en licentie in LICENTIES.md daar).
Uitvoer: src/assets/kaart/modellen.bin.gz, met per model de punten in meters (x vooruit, y dwars, z omhoog, de
voet op de grond en het midden in de oorsprong), een kleur per punt en de driehoeken. De kaart tekent ze met
dezelfde tekenwijze als de gebouwen, dus zonder texturen: de kleur komt uit het materiaal of, bij de eend, uit het
plaatje op de plek van elk punt.
"""

import io
import json
import struct
from pathlib import Path

import numpy as np
from PIL import Image


def schrijf(pad, kop, reeksen):
    """Dezelfde bestandsvorm als de kaartlagen (zie bouw.py): lengte van de kop, de kop als JSON, dan de reeksen."""
    import gzip
    types = {"int16": "i16", "uint16": "u16", "uint8": "u8", "uint32": "u32", "float32": "f32"}
    lijf, delen = b"", {}
    for naam, reeks in reeksen.items():
        reeks = np.ascontiguousarray(reeks)
        lijf += b"\0" * (-len(lijf) % 4)
        delen[naam] = [types[reeks.dtype.name], len(lijf), int(reeks.size)]
        lijf += reeks.tobytes()
    tekst = json.dumps(dict(kop, delen=delen), separators=(",", ":")).encode()
    tekst += b" " * (-len(tekst) % 4)
    pad.write_bytes(gzip.compress(struct.pack("<I", len(tekst)) + tekst + lijf, 9, mtime=0))
    return pad.stat().st_size


ROOT = Path(__file__).resolve().parents[2]
BRON = ROOT / "bronnen" / "_kaart" / "modellen"
UIT = ROOT / "src" / "assets" / "kaart" / "modellen.bin.gz"

SOORT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
AANTAL = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}

# De kleuren van de NS, per materiaalnaam in het treinmodel.
# Het model is voor twee vijfde 'Black' (dak en onderkant); dat wordt hier lichtgrijs, anders valt de trein weg.
INTERCITY = {"White": "#ffc917", "Grey": "#ffc917", "Blue": "#003082", "DarkBlue": "#0b2a66", "Black": "#c9cdd3"}
SPRINTER = {"White": "#f4f4f1", "Grey": "#f4f4f1", "Blue": "#ffc917", "DarkBlue": "#003082", "Black": "#c9cdd3"}
BOOT = {"Sail": "#ffffff", "LightWood": "#c08a54", "DarkWood": "#f4f4f1", "Steel": "#9aa3ad"}


def hex_rgb(h):
    return [int(h[i:i + 2], 16) for i in (1, 3, 5)]


def srgb(lineair):
    c = np.clip(np.asarray(lineair, dtype=np.float64), 0, 1)
    return np.round(np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055) * 255).astype(np.uint8)


def lees_glb(pad):
    b = pad.read_bytes()
    assert b[:4] == b"glTF", pad
    n = struct.unpack("<I", b[12:16])[0]
    kop = json.loads(b[20:20 + n])
    bin_ = b[20 + n + 8:]

    def reeks(i):
        a = kop["accessors"][i]
        v = kop["bufferViews"][a["bufferView"]]
        soort, per = SOORT[a["componentType"]], AANTAL[a["type"]]
        begin = v.get("byteOffset", 0) + a.get("byteOffset", 0)
        stap = v.get("byteStride") or np.dtype(soort).itemsize * per
        ruw = np.frombuffer(bin_, np.uint8, count=(a["count"] - 1) * stap + np.dtype(soort).itemsize * per, offset=begin)
        if stap == np.dtype(soort).itemsize * per:
            return ruw.view(soort).reshape(a["count"], per).copy()
        return np.stack([ruw[i * stap:i * stap + np.dtype(soort).itemsize * per].view(soort) for i in range(a["count"])])

    def beeld(i):
        v = kop["bufferViews"][kop["images"][i]["bufferView"]]
        return np.asarray(Image.open(io.BytesIO(bin_[v.get("byteOffset", 0):v.get("byteOffset", 0) + v["byteLength"]])).convert("RGB"))

    return kop, reeks, beeld


def knoop_matrix(k):
    if "matrix" in k:
        return np.array(k["matrix"], dtype=np.float64).reshape(4, 4).T
    m = np.eye(4)
    x, y, z, w = k.get("rotation", [0, 0, 0, 1])
    m[:3, :3] = [[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                 [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                 [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]]
    m[:3, :3] *= np.array(k.get("scale", [1, 1, 1]))
    m[:3, 3] = k.get("translation", [0, 0, 0])
    return m


def model(naam, lengte, voorkant, kleuren=None):
    """Punten (x vooruit, y dwars, z omhoog), kleur per punt en driehoeken van een glb-bestand.
    `voorkant` zegt hoe je de voorkant herkent: 'hoog' (kop of gewei), 'laag' (neus van de trein) of 'smal' (boeg)."""
    kop, reeks, beeld = lees_glb(BRON / f"{naam}.glb")
    pos, kleur, idx, materiaal = [], [], [], []
    verweven = bool(kop.get("skins"))

    def knoop(i, ouder):
        k = kop["nodes"][i]
        m = ouder @ knoop_matrix(k)
        if "mesh" in k:
            for p in kop["meshes"][k["mesh"]]["primitives"]:
                punten = reeks(p["attributes"]["POSITION"]).astype(np.float64)
                if not ("skin" in k and verweven):
                    # Een net met een skelet staat al in zijn rusthouding; de rest krijgt de plek van zijn knoop.
                    punten = (np.c_[punten, np.ones(len(punten))] @ m.T)[:, :3]
                mat = kop["materials"][p["material"]] if "material" in p else {}
                pbr = mat.get("pbrMetallicRoughness", {})
                if "baseColorTexture" in pbr and "TEXCOORD_0" in p["attributes"]:
                    plaat = beeld(kop["textures"][pbr["baseColorTexture"]["index"]]["source"])
                    uv = reeks(p["attributes"]["TEXCOORD_0"]).astype(np.float64) % 1.0
                    c = plaat[np.clip((uv[:, 1] * plaat.shape[0]).astype(int), 0, plaat.shape[0] - 1),
                              np.clip((uv[:, 0] * plaat.shape[1]).astype(int), 0, plaat.shape[1] - 1)]
                else:
                    vast = hex_rgb(kleuren[mat["name"]]) if kleuren and mat.get("name") in kleuren else srgb(pbr.get("baseColorFactor", [0.6, 0.6, 0.6, 1])[:3])
                    c = np.tile(np.array(vast, np.uint8), (len(punten), 1))
                tri = reeks(p["indices"]).ravel().astype(np.uint32) if "indices" in p else np.arange(len(punten), dtype=np.uint32)
                idx.append(tri + sum(len(q) for q in pos))
                pos.append(punten)
                kleur.append(c)
                materiaal.append(np.full(len(punten), p.get("material", 0)))
        for kind in k.get("children", []):
            knoop(kind, m)

    for wortel in kop["scenes"][kop.get("scene", 0)]["nodes"]:
        knoop(wortel, np.eye(4))
    p = np.concatenate(pos)
    # Welke as wijst omhoog? Die waarop het model op nul staat; bij een net zonder skelet is dat y (de afspraak van glTF).
    omhoog = 1 if not verweven else int(np.argmin(np.abs(p.min(axis=0))))
    vlak = [a for a in range(3) if a != omhoog]
    lang = max(vlak, key=lambda a: np.ptp(p[:, a]))
    dwars = [a for a in vlak if a != lang][0]
    q = np.column_stack([p[:, lang], p[:, dwars], p[:, omhoog]])
    q[:, 0] -= (q[:, 0].min() + q[:, 0].max()) / 2
    q[:, 1] -= (q[:, 1].min() + q[:, 1].max()) / 2
    q[:, 2] -= q[:, 2].min()
    voor, achter = q[q[:, 0] > 0.7 * q[:, 0].max()], q[q[:, 0] < 0.7 * q[:, 0].min()]
    maat = {"hoog": lambda v: v[:, 2].max(), "laag": lambda v: -v[:, 2].max(), "smal": lambda v: -np.ptp(v[:, 1])}[voorkant]
    if maat(achter) > maat(voor):
        q[:, 0] *= -1
    return q, np.concatenate(kleur), np.concatenate(idx), np.concatenate(materiaal), np.ptp(q[:, 0])


def main():
    reeksen, kop = {}, {"modellen": {}}

    def zet(naam, q, kleur, idx, schaal):
        q = q * schaal
        reeksen[f"{naam}P"] = q.astype(np.float32).ravel()
        reeksen[f"{naam}C"] = kleur.astype(np.uint8).ravel()
        reeksen[f"{naam}I"] = idx.astype(np.uint32)
        kop["modellen"][naam] = {"lengte": round(float(np.ptp(q[:, 0])), 2), "breedte": round(float(np.ptp(q[:, 1])), 2), "hoogte": round(float(q[:, 2].max()), 2), "driehoeken": len(idx) // 3}

    # De trein: kop en wagen op dezelfde schaal, in twee kleurstellingen.
    wagen = model("trein-wagen", 1, "laag", INTERCITY)
    schaal = 25.0 / wagen[4]
    for deel in ("trein-kop", "trein-wagen"):
        for kleurnaam, kleuren in (("intercity", INTERCITY), ("sprinter", SPRINTER)):
            q, kleur, idx, _, _ = model(deel, 1, "laag", kleuren)
            zet(f"{kleurnaam}-{deel.split('-')[1]}", q, kleur, idx, schaal)
    for naam, lengte, voorkant, kleuren in (("zeilboot", 9.0, "smal", BOOT), ("hert", 1.7, "hoog", None), ("eend", 0.55, "hoog", None)):
        q, kleur, idx, _, lang = model(naam, lengte, voorkant, kleuren)
        zet(naam, q, kleur, idx, lengte / lang)
    maat = schrijf(UIT, kop, reeksen)
    for naam, m in kop["modellen"].items():
        print(f"  {naam}: {m['lengte']} x {m['breedte']} x {m['hoogte']} m, {m['driehoeken']} driehoeken")
    print(f"modellen: {maat / 1024:.0f} kB")


if __name__ == "__main__":
    main()
