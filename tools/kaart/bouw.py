# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy", "shapely", "mapbox-earcut", "pyproj"]
# ///
"""Maak de kaartlagen voor de stembureaukaart uit de ruwe gegevens van tools/kaart/haal.py.

  uv run tools/kaart/bouw.py

Uitvoer in src/assets/kaart/, in drie detailniveaus die de kaart in de browser naar behoefte laadt:

  basis.bin.gz        de hele gemeente, sterk vereenvoudigd: grondvlakken, hoofdwegen, plaatsnamen, de grootste
                      gebouwen als blok en de stembureaus met hun echte dakvorm. Altijd geladen.
  m/<x>_<y>.bin.gz    blokken van 1 km: grondvlakken en alle wegen in detail, straatnamen en elk gebouw als blok
                      (grondvlak met een hoogte; de browser trekt de muren op).
  h/<x>_<y>.bin.gz    blokken van 500 m: elk gebouw met zijn dakvorm (3D BAG LoD2.2).

Elk bestand is gzip met daarin: lengte van de kop (uint32), de kop als JSON, dan de getallenreeksen. De kop noemt per
reeks het type, de plek en het aantal. Coordinaten zijn in het rijksdriehoeksnet, als gehele getallen ten opzichte van
de hoek van het blok (`schaal` meter per eenheid).
"""

import gzip
import json
import math
import pickle
import struct
import sys
import urllib.parse
import urllib.request
from collections import defaultdict
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import mapbox_earcut as earcut
import numpy as np
import shapely
from pyproj import Transformer
from shapely.geometry import LineString, MultiPolygon, Point, Polygon, box, shape
from shapely.ops import linemerge, polygonize, unary_union
from shapely.strtree import STRtree

ROOT = Path(__file__).resolve().parents[2]
KAART = ROOT / "bronnen" / "_kaart"
RAW = KAART / "raw"
CACHE = RAW / "cache"
UIT = ROOT / "src" / "assets" / "kaart"

XMIN, YMIN, XMAX, YMAX = 129900, 464000, 143900, 478000
KLEIN, GROOT = 500, 1000
RAND = 1200  # zo ver loopt de ondergrond door buiten de gemeente

# Grondvlakken, in de volgorde waarin ze over elkaar getekend worden.
LAND, BEBOUWD, BEDRIJF, GRAS, HEIDE, ZAND, BOS, MOERAS, SPORT, WATER = range(10)
# Wegen: hoofdweg, doorgaande weg, straat, erf- en parkeerweg, pad, spoor, gemeentegrens.
HOOFD, WEG, STRAAT, DIENST, PAD, SPOOR, GRENS = range(7)

NAAR_RD = Transformer.from_crs("EPSG:4326", "EPSG:28992", always_xy=True)
# Plaatsnamen: stad, dorp, buurtschap of wijk, buurt.
RANG = {"city": 0, "town": 0, "village": 1, "hamlet": 2, "suburb": 2, "quarter": 2, "neighbourhood": 3}


def grens():
    """De nieuwe gemeente: Hilversum en Wijdemeren samen. De twee oude grenzen sluiten niet op de centimeter op elkaar
    aan; de kieren ertussen tellen niet als grens."""
    samen = unary_union([shape(json.load(open(p))["features"][0]["geometry"]) for p in sorted(KAART.glob("g_*.json"))])
    samen = samen.buffer(2).buffer(-2)
    delen = [Polygon(p.exterior) for p in (samen.geoms if samen.geom_type == "MultiPolygon" else [samen]) if p.area > 1000]
    return unary_union(delen)


# ---------------------------------------------------------------------------------------------------------------
# Bestandsvorm

TYPES = {"int16": "i16", "uint16": "u16", "uint8": "u8", "uint32": "u32", "int8": "i8"}


def schrijf(pad, kop, reeksen):
    lijf, delen = b"", {}
    for naam, reeks in reeksen.items():
        reeks = np.ascontiguousarray(reeks)
        lijf += b"\0" * (-len(lijf) % 4)
        delen[naam] = [TYPES[reeks.dtype.name], len(lijf), int(reeks.size)]
        lijf += reeks.tobytes()
    kop = dict(kop, delen=delen)
    tekst = json.dumps(kop, separators=(",", ":"), ensure_ascii=False).encode()
    tekst += b" " * (-len(tekst) % 4)
    pad.parent.mkdir(parents=True, exist_ok=True)
    pad.write_bytes(gzip.compress(struct.pack("<I", len(tekst)) + tekst + lijf, 9, mtime=0))
    return pad.stat().st_size


# ---------------------------------------------------------------------------------------------------------------
# Gebouwen uit 3D BAG

def driehoeken(ringen):
    """Vlak in de ruimte (ringen van punten, de eerste is de buitenrand) naar driehoeken: indexen in de punten."""
    punten = np.concatenate(ringen)
    if len(punten) < 3:
        return np.zeros(0, np.uint32)
    # Newell: de normaal van het vlak; laat de as vallen waar die het meest langs wijst.
    a, b = ringen[0], np.roll(ringen[0], -1, axis=0)
    n = np.array([np.sum((a[:, 1] - b[:, 1]) * (a[:, 2] + b[:, 2])), np.sum((a[:, 2] - b[:, 2]) * (a[:, 0] + b[:, 0])),
                  np.sum((a[:, 0] - b[:, 0]) * (a[:, 1] + b[:, 1]))])
    assen = [i for i in range(3) if i != int(np.argmax(np.abs(n)))]
    einden = np.cumsum([len(r) for r in ringen]).astype(np.uint32)
    return earcut.triangulate_float64(np.ascontiguousarray(punten[:, assen], dtype=np.float64), einden)


def blok_van(ringen, hoogte):
    """Een grondvlak met rechte muren en een plat dak, als punten, soort (0 muur, 1 dak) en driehoeken."""
    pos, soort, idx = [], [], []
    for r in ringen:
        n, basis = len(r), len(pos)
        for x, y in r:
            pos += [(x, y, 0.0), (x, y, hoogte)]
            soort += [0, 0]
        for i in range(n):
            a, b = basis + 2 * i, basis + 2 * ((i + 1) % n)
            idx += [a, b, b + 1, a, b + 1, a + 1]
    basis = len(pos)
    vlak = [np.column_stack([r, np.full(len(r), hoogte)]) for r in ringen]
    for p in np.concatenate(vlak):
        pos.append(tuple(p))
        soort.append(1)
    idx += [basis + int(i) for i in driehoeken(vlak)]
    return np.array(pos, np.float32), np.array(soort, np.uint8), np.array(idx, np.uint32)


def lees_vierkant(pad):
    """Alle gebouwen met hun zwaartepunt in dit vierkant: grondvlak, hoogte en de driehoeken van muren en daken."""
    x0, y0 = map(int, pad.name.split(".")[0].split("_"))
    doel = CACHE / f"{x0}_{y0}.pickle"
    if doel.exists():
        return doel
    uit = []
    for regel in gzip.open(pad, "rt"):
        if not regel.strip():
            continue
        f = json.loads(regel)
        t = f["transform"]
        v = np.array(f["vertices"], dtype=np.float64) * t["scale"] + t["translate"]
        ouder = next((o for o in f["CityObjects"].values() if o["type"] == "Building"), None)
        if ouder is None or not ouder.get("geometry"):
            continue
        a = ouder.get("attributes", {})
        if a.get("status") in ("Pand gesloopt", "Niet gerealiseerd pand", "Pand ten onrechte opgevoerd"):
            continue
        ringen = []
        for vlak in ouder["geometry"][0]["boundaries"]:
            for r in vlak:
                ringen.append(v[r][:, :2])
        try:
            grond = Polygon(ringen[0], ringen[1:])
            if not grond.is_valid:
                grond = grond.buffer(0)
            if grond.is_empty or grond.area < 4:
                continue
        except Exception:  # noqa: BLE001
            continue
        c = grond.centroid
        if not (x0 <= c.x < x0 + KLEIN and y0 <= c.y < y0 + KLEIN):
            continue
        maaiveld = a.get("b3_h_maaiveld")
        dak = a.get("b3_h_dak_70p") or a.get("b3_h_dak_max")
        hoogte = (dak - maaiveld) if (dak is not None and maaiveld is not None) else 3.0
        if hoogte < 1.2:
            # Geen hoogte gemeten (nieuwbouw) of onder de grond: een laag blok is beter dan een gat.
            hoogte = 3.0 if dak is None else max(hoogte, 0)
            if hoogte < 1.2:
                continue
        pos, soort, idx = [], [], []
        if maaiveld is not None and grond.area >= 25:
            for kind in f["CityObjects"].values():
                if kind["type"] != "BuildingPart":
                    continue
                g = next((g for g in kind["geometry"] if g["lod"] == "2.2"), None)
                if g is None:
                    continue
                types = [s["type"] for s in g["semantics"]["surfaces"]]
                for schil, waarden in zip(g["boundaries"], g["semantics"]["values"]):
                    for vlak, w in zip(schil, waarden):
                        soort_vlak = types[w] if w is not None else "WallSurface"
                        if soort_vlak == "GroundSurface":
                            continue
                        r3 = [v[r] for r in vlak if len(r) >= 3]
                        if not r3:
                            continue
                        try:
                            tri = driehoeken(r3)
                        except Exception:  # noqa: BLE001
                            continue
                        basis = len(pos)
                        for p in np.concatenate(r3):
                            pos.append((p[0], p[1], max(p[2] - maaiveld, 0.0)))
                            soort.append(1 if soort_vlak == "RoofSurface" else 0)
                        idx += [basis + int(i) for i in tri]
        geom = grond if grond.geom_type == "Polygon" else max(grond.geoms, key=lambda p: p.area)
        uit.append({
            "id": a.get("identificatie") or f["id"], "x": c.x, "y": c.y, "opp": grond.area, "hoogte": float(hoogte),
            "grond": shapely.to_wkb(geom),
            "pos": np.array(pos, np.float32).reshape(-1, 3), "soort": np.array(soort, np.uint8), "idx": np.array(idx, np.uint32),
            "jaar": a.get("oorspronkelijkbouwjaar"),
        })
    doel.parent.mkdir(parents=True, exist_ok=True)
    doel.with_suffix(".tmp").write_bytes(pickle.dumps(uit))
    doel.with_suffix(".tmp").rename(doel)
    return doel


def ringen_van(veelhoek, tol):
    """Vereenvoudigd grondvlak als lijst van ringen (zonder herhaald eindpunt), of None als er niets overblijft."""
    g = veelhoek.simplify(tol, preserve_topology=True)
    if g.is_empty or g.geom_type != "Polygon" or g.area < 4:
        return None
    ringen = [np.array(g.exterior.coords)[:-1]] + [np.array(r.coords)[:-1] for r in g.interiors if Polygon(r).area > 6]
    return ringen if len(ringen[0]) >= 3 else None


def pak_blokken(gebouwen, x0, y0, schaal, tol, kwadrant=None):
    """Gebouwen als grondvlak met hoogte: de reeksen die de browser tot blokken optrekt."""
    lh, lr, lrn, lp, ltn, lt, telling = [], [], [], [], [], [], [0, 0, 0, 0]
    if kwadrant:
        gebouwen = sorted(gebouwen, key=kwadrant)
    for g in gebouwen:
        ringen = ringen_van(g["veelhoek"], tol)
        if ringen is None:
            continue
        vlak = np.concatenate(ringen)
        tri = earcut.triangulate_float64(np.ascontiguousarray(vlak, dtype=np.float64),
                                         np.cumsum([len(r) for r in ringen]).astype(np.uint32))
        if len(tri) == 0 or len(vlak) > 65000:
            continue
        lh.append(min(int(round(g["hoogte"] * 10)), 65535))
        lr.append(len(ringen))
        lrn += [len(r) for r in ringen]
        lp.append(np.round((vlak - (x0, y0)) / schaal).astype(np.int16))
        ltn.append(len(tri) // 3)
        lt.append(tri.astype(np.uint16))
        if kwadrant:
            telling[kwadrant(g)] += 1
    leeg = np.zeros(0, np.int16)
    return {
        "lH": np.array(lh, np.uint16), "lR": np.array(lr, np.uint8), "lRN": np.array(lrn, np.uint16),
        "lP": np.concatenate(lp).ravel() if lp else leeg, "lTN": np.array(ltn, np.uint16),
        "lT": np.concatenate(lt) if lt else np.zeros(0, np.uint16),
    }, telling, len(lh)


def pak_net(gebouwen, x0, y0, anker_hoogte=0.0):
    """Gebouwen met dakvorm als een net van driehoeken: punten (dm), soort per punt en indexen."""
    pos, soort, idx, basis = [], [], [], 0
    for g in gebouwen:
        p, s, i = g["pos"], g["soort"], g["idx"]
        if len(i) == 0:
            ringen = ringen_van(g["veelhoek"], 0.25)
            if ringen is None:
                continue
            p, s, i = blok_van(ringen, g["hoogte"])
        # Dezelfde plek met dezelfde soort maar een keer opslaan.
        q = np.round((p - (x0, y0, anker_hoogte)) * 10).astype(np.int32)
        sleutel = np.column_stack([q, s.astype(np.int32)])
        uniek, terug = np.unique(sleutel, axis=0, return_inverse=True)
        terug = terug.ravel()
        pos.append(uniek[:, :3])
        soort.append(uniek[:, 3])
        idx.append(terug[i] + basis)
        basis += len(uniek)
    if not pos:
        return None
    pos = np.clip(np.concatenate(pos), -32768, 32767).astype(np.int16)
    idx = np.concatenate(idx)
    return {"hP": pos.ravel(), "hK": np.concatenate(soort).astype(np.uint8),
            "hI": idx.astype(np.uint16 if basis < 65536 else np.uint32)}


# ---------------------------------------------------------------------------------------------------------------
# Stembureaus: het adres opzoeken in de BAG en het gebouw erbij vinden

def zoek_adressen(bureaus):
    """Het punt van elk adres in de BAG (PDOK Locatieserver), gezocht op straat, huisnummer en plaats apart: vrij
    zoeken geeft bij 'Emmastraat 1' net zo lief 'Emmastraat 20A-1' terug."""
    import re

    doel = KAART / "adressen.json"
    bekend = json.load(open(doel)) if doel.exists() else {}
    for b in bureaus:
        sleutel = f"{b['adres']}, {b['plaats']}"
        if sleutel in bekend:
            continue
        m = re.match(r"^(.*?)\s+(\d+)\s*([A-Za-z]?)\s*$", b["adres"])
        if not m:
            bekend[sleutel] = None
            continue
        straat, nummer, letter = m.group(1), m.group(2), m.group(3).upper()
        q = [("q", "*:*"), ("fq", "type:adres"), ("fq", f'straatnaam:"{straat}"'), ("fq", f'woonplaatsnaam:"{b["plaats"]}"'),
             ("fq", f"huisnummer:{nummer}"), ("rows", 30), ("fl", "weergavenaam,centroide_rd,straatnaam,huisletter,huisnummertoevoeging")]
        try:
            with urllib.request.urlopen(urllib.request.Request(
                    f"https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?{urllib.parse.urlencode(q)}",
                    headers={"User-Agent": "kaart-bouw/0.1"}), timeout=30) as r:
                docs = json.loads(r.read())["response"]["docs"]
        except Exception as fout:  # noqa: BLE001
            print(f"adres {sleutel}: {fout}", file=sys.stderr)
            continue
        docs = [d for d in docs if d.get("straatnaam", "").lower() == straat.lower()]  # niet 'Hoge Larenseweg' voor 'Larenseweg'
        # Het adres met precies deze letter; staat er geen letter, dan het adres zonder letter of toevoeging.
        goed = [d for d in docs if (d.get("huisletter") or "").upper() == letter and (letter or not d.get("huisnummertoevoeging"))]
        kies = (goed or [d for d in docs if (d.get("huisletter") or "").upper() == letter] or (docs if not letter else []))[:1]
        if kies:
            x, y = kies[0]["centroide_rd"].replace("POINT(", "").replace(")", "").split()
            bekend[sleutel] = {"naam": kies[0]["weergavenaam"], "x": float(x), "y": float(y)}
        else:
            bekend[sleutel] = None
    doel.write_text(json.dumps(bekend, ensure_ascii=False, indent=1))
    return bekend


# ---------------------------------------------------------------------------------------------------------------
# Ondergrond uit OpenStreetMap

def klasse_vlak(t):
    lu, nat, lei = t.get("landuse"), t.get("natural"), t.get("leisure")
    if nat == "water" or lu in ("reservoir", "basin"):
        return WATER
    if nat == "wetland":
        return MOERAS
    if nat in ("wood", "scrub") or lu == "forest":
        return BOS
    if nat == "heath":
        return HEIDE
    if nat == "sand":
        return ZAND
    if lei == "pitch":
        return SPORT
    if nat == "grassland" or lei in ("park", "garden", "golf_course", "playground", "sports_centre"):
        return GRAS
    if lu == "residential":
        return BEBOUWD
    if lu in ("industrial", "commercial", "retail", "railway", "garages", "construction", "education", "institutional"):
        return BEDRIJF
    if lu in ("meadow", "grass", "farmland", "village_green", "recreation_ground", "orchard", "allotments", "cemetery",
              "farmyard", "greenfield", "plant_nursery", "flowerbed", "greenhouse_horticulture"):
        return GRAS
    return None


WATERLOOP = {"river": 14, "canal": 10, "stream": 3, "ditch": 2, "drain": 2}
WEGKLASSE = {
    "motorway": HOOFD, "motorway_link": HOOFD, "trunk": HOOFD, "trunk_link": HOOFD, "primary": HOOFD, "primary_link": HOOFD,
    "secondary": WEG, "secondary_link": WEG, "tertiary": WEG, "tertiary_link": WEG,
    "unclassified": STRAAT, "residential": STRAAT, "living_street": STRAAT, "pedestrian": STRAAT,
    "service": DIENST, "cycleway": PAD, "footway": PAD, "path": PAD, "track": PAD,
}


def lees_vlakken(osm, gebied):
    """Grondvlakken per klasse, samengevoegd en binnen de gemeente."""
    per = defaultdict(list)
    for t, wkb in osm["vlakken"]:
        k = klasse_vlak(t)
        if k is not None:
            per[k].append(shapely.from_wkb(wkb))
    for t, p in osm["lijnen"]:
        if t.get("waterway") in WATERLOOP and not t.get("tunnel"):
            per[WATER].append(LineString(p).buffer(WATERLOOP[t["waterway"]] / 2, cap_style="flat", quad_segs=2))
    uit = {}
    for k, vlakken in per.items():
        vlakken = [v if v.is_valid else v.buffer(0) for v in vlakken]
        samen = unary_union([v for v in vlakken if not v.is_empty]).intersection(gebied)
        uit[k] = samen
        print(f"  vlakken klasse {k}: {len(vlakken)} -> {samen.area / 1e6:.1f} km2", file=sys.stderr)
    uit[LAND] = gebied
    return uit


def veelhoeken(g):
    if g.is_empty:
        return []
    if g.geom_type == "Polygon":
        return [g]
    if g.geom_type in ("MultiPolygon", "GeometryCollection"):
        return [p for d in g.geoms for p in veelhoeken(d)]
    return []


def lijnen(g):
    if g.is_empty:
        return []
    if g.geom_type == "LineString":
        return [g]
    if g.geom_type in ("MultiLineString", "GeometryCollection"):
        return [p for d in g.geoms for p in lijnen(d)]
    return []


def pak_vlakken(per_klasse, x0, y0, schaal, kleinste):
    """Driehoeken van alle vlakken, per klasse in tekenvolgorde."""
    pos, klasse, idx, basis = [], [], [], 0
    for k in sorted(per_klasse):
        for v in per_klasse[k]:
            if v.area < kleinste:
                continue
            ringen = [np.array(v.exterior.coords)[:-1]] + [np.array(r.coords)[:-1] for r in v.interiors]
            ringen = [r for r in ringen if len(r) >= 3]
            if not ringen:
                continue
            vlak = np.concatenate(ringen)
            tri = earcut.triangulate_float64(np.ascontiguousarray(vlak), np.cumsum([len(r) for r in ringen]).astype(np.uint32))
            if len(tri) == 0:
                continue
            pos.append(np.round((vlak - (x0, y0)) / schaal).astype(np.int16))
            klasse.append(np.full(len(vlak), k, np.uint8))
            idx.append(tri.astype(np.uint32) + basis)
            basis += len(vlak)
    if not pos:
        return {"gP": np.zeros(0, np.int16), "gK": np.zeros(0, np.uint8), "gI": np.zeros(0, np.uint16)}
    idx = np.concatenate(idx)
    return {"gP": np.concatenate(pos).ravel(), "gK": np.concatenate(klasse),
            "gI": idx.astype(np.uint16 if basis < 65536 else np.uint32)}


def pak_wegen(wegen, x0, y0, schaal):
    """Wegen als lijnen: klasse en aantal punten per lijn, dan de punten."""
    wk, wn, wp = [], [], []
    # Tekenvolgorde: paden onderop, hoofdwegen erboven, dan het spoor en de gemeentegrens.
    for k, lijn in sorted(((w[0], w[1]) for w in wegen), key=lambda w: -w[0] if w[0] < SPOOR else w[0]):
        p = np.array(lijn.coords)
        if len(p) < 2 or len(p) > 65000:
            continue
        wk.append(k)
        wn.append(len(p))
        wp.append(np.round((p - (x0, y0)) / schaal).astype(np.int16))
    return {"wK": np.array(wk, np.uint8), "wN": np.array(wn, np.uint16),
            "wP": np.concatenate(wp).ravel() if wp else np.zeros(0, np.int16)}


def lees_wegen(osm, gebied):
    uit = []
    for t, p in osm["lijnen"]:
        if t.get("tunnel") in ("yes", "building_passage") or t.get("area") == "yes":
            continue
        if t.get("railway"):
            if t["railway"] not in ("rail", "light_rail") or t.get("service"):
                continue
            k = SPOOR
        else:
            k = WEGKLASSE.get(t.get("highway"))
            if k is None or (t.get("access") == "private" and k >= DIENST):
                continue
        for deel in lijnen(LineString(p).intersection(gebied)):
            if deel.length > 2:
                uit.append((k, deel, t.get("name")))
    return uit


WEGBREEDTE = {HOOFD: 9, WEG: 7, STRAAT: 5.5, DIENST: 4, PAD: 2.6, SPOOR: 5}


def pak_bomen(bos, losse, vrij_van, x0, y0, zaad):
    """Bomen in een blok: het bos gevuld op een rooster met wat toeval, plus de bomen en bomenrijen die los in
    OpenStreetMap staan. Niet op wegen en niet in gebouwen. Per boom de plek (dm) en de hoogte (halve meters)."""
    toeval = np.random.default_rng(zaad)
    punten = []
    if bos is not None and not bos.is_empty:
        minx, miny, maxx, maxy = bos.bounds
        stap = 13.0
        gx, gy = np.meshgrid(np.arange(minx, maxx + stap, stap), np.arange(miny, maxy + stap, stap))
        px = gx.ravel() + toeval.uniform(-5.2, 5.2, gx.size)
        py = gy.ravel() + toeval.uniform(-5.2, 5.2, gy.size)
        in_bos = shapely.contains_xy(bos, px, py)
        punten += [(x, y, h) for x, y, h in zip(px[in_bos], py[in_bos], toeval.uniform(11, 19, int(in_bos.sum())))]
    punten += [(x, y, h) for (x, y), h in zip(losse, toeval.uniform(8, 14, len(losse)))]
    if not punten:
        return {"tP": np.zeros(0, np.int16), "tG": np.zeros(0, np.uint8)}
    p = np.array(punten)
    houd = np.ones(len(p), bool) if vrij_van is None or vrij_van.is_empty else ~shapely.contains_xy(vrij_van, p[:, 0], p[:, 1])
    p = p[houd]
    return {"tP": np.round((p[:, :2] - (x0, y0)) * 10).astype(np.int16).ravel(), "tG": np.round(p[:, 2] * 2).astype(np.uint8)}


def pak_leven(vlakken, wegen, gebied):
    """Wat er op de kaart beweegt: de spoorbanen voor de treinen, vaarrondjes voor zeilboten op de grote plassen,
    plekken voor eenden in vijvers en sloten en voor herten op de hei. Alles in meters vanaf de hoek van het gebied."""
    toeval = np.random.default_rng(1811)
    rel = lambda punten: [[round(x - XMIN, 1), round(y - YMIN, 1)] for x, y in punten]  # noqa: E731

    def punt_in(vlak):
        minx, miny, maxx, maxy = vlak.bounds
        for _ in range(300):
            p = Point(toeval.uniform(minx, maxx), toeval.uniform(miny, maxy))
            if vlak.contains(p):
                return p
        return None

    banen = sorted(lijnen(linemerge([l for k, l, _ in wegen if k == SPOOR])), key=lambda l: -l.length)
    spoor = [rel(b.simplify(1.5).coords) for b in banen[:4] if b.length > 2500]

    boten, eenden = [], []
    water = veelhoeken(vlakken[WATER].intersection(gebied))
    for plas in sorted(water, key=lambda v: -v.area):
        if plas.area < 250000:
            break
        ruim_water = max(veelhoeken(plas.buffer(-70)), key=lambda v: v.area, default=None)
        if ruim_water is None:
            continue
        for _ in range(int(min(max(plas.area / 700000, 1), 5))):
            rondje = [punt_in(ruim_water)]
            while len(rondje) < 5 and rondje[0] is not None:
                for _ in range(200):
                    q = punt_in(ruim_water)
                    if q is not None and 150 < q.distance(rondje[-1]) < 1200 and ruim_water.contains(LineString([rondje[-1], q])):
                        rondje.append(q)
                        break
                else:
                    break
            if len(rondje) >= 3 and ruim_water.contains(LineString([rondje[-1], rondje[0]])):
                boten.append(rel((p.x, p.y) for p in rondje))
    vijvers = [v for v in water if 400 < v.area < 60000]
    for i in toeval.permutation(len(vijvers))[:36]:
        binnen_ = max(veelhoeken(vijvers[i].buffer(-3)), key=lambda v: v.area, default=None)
        p = punt_in(binnen_) if binnen_ is not None else None
        if p is not None:
            eenden.append([round(p.x - XMIN, 1), round(p.y - YMIN, 1)])
    herten = []
    for hei in veelhoeken(vlakken[HEIDE].intersection(gebied)):
        binnen_ = max(veelhoeken(hei.buffer(-30)), key=lambda v: v.area, default=None)
        if binnen_ is None or binnen_.area < 15000:
            continue
        for _ in range(int(min(max(binnen_.area / 250000, 1), 4))):
            p = punt_in(binnen_)
            if p is not None:
                herten.append([round(p.x - XMIN, 1), round(p.y - YMIN, 1)])
    print(f"  leven: {len(spoor)} spoorbanen, {len(boten)} boten, {len(eenden)} groepjes eenden, {len(herten)} groepjes herten", file=sys.stderr)
    return {"spoor": spoor, "boten": boten, "eenden": eenden, "herten": herten}


def straatnamen(wegen, rechthoek, x0, y0):
    """Per straatnaam het langste stuk binnen het blok: naam, midden, richting, lengte en klasse."""
    best = {}
    for k, lijn, naam in wegen:
        if not naam or k > STRAAT:
            continue
        for deel in lijnen(lijn.intersection(rechthoek)):
            if deel.length > best.get(naam, (0,))[0]:
                best[naam] = (deel.length, deel, k)
    uit = []
    for naam, (lengte, deel, k) in best.items():
        if lengte < 45:
            continue
        m, a, b = deel.interpolate(0.5, normalized=True), deel.interpolate(0.42, normalized=True), deel.interpolate(0.58, normalized=True)
        uit.append([naam, round(m.x - x0, 1), round(m.y - y0, 1), round(math.degrees(math.atan2(b.y - a.y, b.x - a.x))), round(lengte), k])
    return uit


# ---------------------------------------------------------------------------------------------------------------

def main():
    gebied = grens()
    UIT.mkdir(parents=True, exist_ok=True)

    print("gebouwen lezen", file=sys.stderr)
    paden = sorted((RAW / "3dbag").glob("*.jsonl.gz"))
    with ProcessPoolExecutor(12) as pool:
        caches = list(pool.map(lees_vierkant, paden, chunksize=4))
    binnen = shapely.prepared.prep(gebied.buffer(5))
    gebouwen = []
    for c in caches:
        for g in pickle.loads(c.read_bytes()):
            if binnen.contains(Point(g["x"], g["y"])):
                g["veelhoek"] = shapely.from_wkb(g["grond"])
                gebouwen.append(g)
    print(f"  {len(gebouwen)} gebouwen in de gemeente, {sum(len(g['idx']) for g in gebouwen) // 3} driehoeken met dakvorm", file=sys.stderr)

    # Stembureaus bij hun gebouw zoeken.
    bureaus = json.load(open(ROOT / "bronnen" / "_verkiezing" / "stembureaus.json"))
    adressen = zoek_adressen(bureaus)
    boom = STRtree([g["veelhoek"] for g in gebouwen])
    bezet, uit_bureaus, net_delen, basis_v, basis_i = set(), [], {"bP": [], "bK": [], "bI": []}, 0, 0
    for nr, b in enumerate(bureaus):
        adres = adressen.get(f"{b['adres']}, {b['plaats']}")
        ox, oy = NAAR_RD.transform(b["lon"], b["lat"]) if b.get("lat") else (None, None)
        if adres:
            px, py = adres["x"], adres["y"]
            if ox is not None and math.hypot(px - ox, py - oy) > 150:
                print(f"  let op: {b['naam']} ({b['adres']}): BAG-adres ligt {math.hypot(px - ox, py - oy):.0f} m van het eerder gevonden punt", file=sys.stderr)
        elif ox is not None:
            px, py = ox, oy
            print(f"  geen BAG-adres voor {b['naam']} ({b['adres']}, {b['plaats']}); eerder gevonden punt gebruikt", file=sys.stderr)
        else:
            print(f"  GEEN PLEK voor {b['naam']}", file=sys.stderr)
            uit_bureaus.append(None)
            continue
        punt = Point(px, py)
        i = boom.nearest(punt)
        g = gebouwen[i] if gebouwen[i]["veelhoek"].distance(punt) < 35 else None
        info = {"x": round(px - XMIN, 1), "y": round(py - YMIN, 1)}
        if g is not None:
            c = g["veelhoek"].centroid
            info["x"], info["y"] = round(c.x - XMIN, 1), round(c.y - YMIN, 1)
            if i not in bezet:
                net = pak_net([g], c.x, c.y)
                bezet.add(i)
            else:
                net = None  # twee stembureaus in hetzelfde gebouw: het gebouw een keer tekenen
            minx, miny, maxx, maxy = g["veelhoek"].bounds
            info["maat"] = round(max(maxx - minx, maxy - miny), 1)
            info["hoogte"] = round(float(g["pos"][:, 2].max()) if len(g["pos"]) else g["hoogte"], 1)
            if net:
                info["net"] = [basis_v, len(net["hK"]), basis_i, len(net["hI"])]
                net_delen["bP"].append(net["hP"])
                net_delen["bK"].append(net["hK"])
                net_delen["bI"].append(net["hI"].astype(np.uint32))
                basis_v += len(net["hK"])
                basis_i += len(net["hI"])
        else:
            print(f"  geen gebouw binnen 35 m voor {b['naam']} ({b['adres']})", file=sys.stderr)
        uit_bureaus.append(info)
    # Stembureaus die op dezelfde plek uitkomen (zelfde gebouw) iets uit elkaar zetten is niet nodig: de kaart
    # toont ze als een punt met meerdere namen.
    rest = [g for i, g in enumerate(gebouwen) if i not in bezet]

    print("ondergrond lezen", file=sys.stderr)
    osm = pickle.loads((RAW / "osm.pickle").read_bytes())
    # De ondergrond loopt een eind door over de gemeentegrens, zodat een stembureau aan de rand niet aan een leeg vlak
    # ligt. Buiten de grens komt er een sluier over en staan er geen gebouwen.
    ruim = gebied.buffer(RAND).intersection(box(XMIN, YMIN, XMAX, YMAX))
    vlakken = lees_vlakken(osm, ruim)
    wegen = lees_wegen(osm, ruim)
    print(f"  {len(wegen)} wegstukken", file=sys.stderr)

    # ---- basis: de hele gemeente, sterk vereenvoudigd
    schaal = 0.5
    grof = {}
    for k, v in vlakken.items():
        g = v.simplify(3 if k == LAND else 9, preserve_topology=True)
        g = g.buffer(0) if not g.is_valid else g
        grof[k] = veelhoeken(g)
    reeksen = pak_vlakken(grof, XMIN, YMIN, schaal, 4000)
    sluier = pak_vlakken({0: veelhoeken(ruim.difference(gebied.simplify(3)))}, XMIN, YMIN, schaal, 0)
    reeksen.update({"sP": sluier["gP"], "sI": sluier["gI"]})
    hoofd = [(k, l.simplify(5), n) for k, l, n in wegen if k in (HOOFD, WEG, SPOOR)]
    hoofd += [(GRENS, LineString(r.coords).simplify(3), None) for p in veelhoeken(gebied) for r in [p.exterior, *p.interiors]]
    reeksen.update(pak_wegen(hoofd, XMIN, YMIN, schaal))
    grote = [g for g in rest if g["opp"] >= 900]
    blokken, _, n_groot = pak_blokken(grote, XMIN, YMIN, schaal, 2.5)
    reeksen.update(blokken)
    for naam, delen in net_delen.items():
        reeksen[naam] = np.concatenate(delen) if delen else np.zeros(0, np.int16)
    plaatsen = []
    for naam, soort, x, y in osm["plaatsen"]:
        if soort in RANG and gebied.contains(Point(x, y)):
            plaatsen.append([naam, round(x - XMIN), round(y - YMIN), RANG[soort]])
    leven = pak_leven(vlakken, wegen, gebied)
    m_blokken = sorted({(int((g["x"] - XMIN) // GROOT), int((g["y"] - YMIN) // GROOT)) for g in rest}
                       | {(ix, iy) for ix in range((XMAX - XMIN) // GROOT) for iy in range((YMAX - YMIN) // GROOT)
                          if ruim.intersects(box(XMIN + ix * GROOT, YMIN + iy * GROOT, XMIN + (ix + 1) * GROOT, YMIN + (iy + 1) * GROOT))})
    h_blokken = sorted({(int((g["x"] - XMIN) // KLEIN), int((g["y"] - YMIN) // KLEIN)) for g in rest})
    minx, miny, maxx, maxy = gebied.bounds
    kop = {
        "gebied": [XMIN, YMIN, XMAX, YMAX], "grenzen": [round(minx), round(miny), round(maxx), round(maxy)], "schaal": schaal,
        "groot": GROOT, "klein": KLEIN, "m": [f"{XMIN + ix * GROOT}_{YMIN + iy * GROOT}" for ix, iy in m_blokken],
        "h": [f"{XMIN + ix * KLEIN}_{YMIN + iy * KLEIN}" for ix, iy in h_blokken], "plaatsen": plaatsen, "bureaus": uit_bureaus, "leven": leven,
    }
    maat = schrijf(UIT / "basis.bin.gz", kop, reeksen)
    print(f"basis: {maat / 1024:.0f} kB, {n_groot} grote gebouwen, {len(plaatsen)} plaatsnamen", file=sys.stderr)

    # ---- blokken van 1 km: detail van grond, wegen en gebouwen als blok
    fijn = {k: (v.simplify(0.6, preserve_topology=True) if k != LAND else v) for k, v in vlakken.items()}
    fijn = {k: (v if v.is_valid else v.buffer(0)) for k, v in fijn.items()}
    delen = {k: veelhoeken(v) for k, v in fijn.items()}
    bomen = {k: STRtree(d) for k, d in delen.items() if d}
    weg_boom = STRtree([l for _, l, _ in wegen])
    # Losse bomen uit OpenStreetMap: punten, en bomenrijen met om de negen meter een boom.
    losse = [Point(x, y) for x, y in osm.get("bomen", [])]
    for t, p in osm["lijnen"]:
        if t.get("natural") == "tree_row":
            rij = LineString(p)
            losse += [rij.interpolate(d) for d in np.arange(0, rij.length + 0.1, 9.0)]
    losse = [b for b in losse if binnen.contains(b)]
    los_boom = STRtree(losse) if losse else None
    gebouw_boom = STRtree([g["veelhoek"] for g in gebouwen])
    n_bomen = 0
    per_m = defaultdict(list)
    for g in rest:
        per_m[(int((g["x"] - XMIN) // GROOT), int((g["y"] - YMIN) // GROOT))].append(g)
    for doel in (UIT / "m", UIT / "h"):
        for oud in doel.glob("*.bin.gz"):
            oud.unlink()
    totaal_m = 0
    for ix, iy in m_blokken:
        x0, y0 = XMIN + ix * GROOT, YMIN + iy * GROOT
        rechthoek = box(x0, y0, x0 + GROOT, y0 + GROOT)
        per_klasse = {}
        for k, boom_k in bomen.items():
            stukken = []
            for i in boom_k.query(rechthoek):
                stukken += veelhoeken(delen[k][i].intersection(rechthoek))
            per_klasse[k] = stukken
        reeksen = pak_vlakken(per_klasse, x0, y0, 0.1, 12)
        hier = []
        for i in weg_boom.query(rechthoek):
            k, lijn, naam = wegen[i]
            for deel in lijnen(lijn.intersection(rechthoek)):
                if deel.length > 1.5:
                    hier.append((k, deel.simplify(0.4), naam))
        reeksen.update(pak_wegen(hier, x0, y0, 0.1))
        kwadrant = lambda g, x0=x0, y0=y0: int(g["x"] - x0 >= KLEIN) + 2 * int(g["y"] - y0 >= KLEIN)  # noqa: E731
        blokken, telling, _ = pak_blokken([g for g in per_m.get((ix, iy), []) if g["opp"] >= 9], x0, y0, 0.1, 0.35, kwadrant)
        reeksen.update(blokken)
        bos = unary_union(per_klasse.get(BOS, [])).intersection(gebied) if per_klasse.get(BOS) else None
        hindernis = unary_union([lijn.buffer(WEGBREEDTE[k] / 2 + 1.5, quad_segs=1) for k, lijn, _ in hier if k in WEGBREEDTE]
                                + [gebouwen[i]["veelhoek"].buffer(2.5, quad_segs=1) for i in gebouw_boom.query(rechthoek)]
                                + veelhoeken(unary_union(per_klasse.get(WATER, []) or [Point(0, 0).buffer(0)])))
        hier_los = [(losse[i].x, losse[i].y) for i in los_boom.query(rechthoek)] if los_boom else []
        bomen_hier = pak_bomen(bos, hier_los, hindernis, x0, y0, ix * 1000 + iy)
        n_bomen += len(bomen_hier["tG"])
        reeksen.update(bomen_hier)
        namen = straatnamen([wegen[i] for i in weg_boom.query(rechthoek)], rechthoek, x0, y0)
        totaal_m += schrijf(UIT / "m" / f"{x0}_{y0}.bin.gz", {"x": x0, "y": y0, "schaal": 0.1, "kwadrant": telling, "namen": namen}, reeksen)
    print(f"m: {len(m_blokken)} blokken, {totaal_m / 1e6:.1f} MB, {n_bomen} bomen", file=sys.stderr)

    # ---- blokken van 500 m: gebouwen met dakvorm
    per_h = defaultdict(list)
    for g in rest:
        per_h[(int((g["x"] - XMIN) // KLEIN), int((g["y"] - YMIN) // KLEIN))].append(g)
    totaal_h = 0
    for (ix, iy), lijst in sorted(per_h.items()):
        x0, y0 = XMIN + ix * KLEIN, YMIN + iy * KLEIN
        net = pak_net(lijst, x0, y0)
        if net:
            totaal_h += schrijf(UIT / "h" / f"{x0}_{y0}.bin.gz", {"x": x0, "y": y0, "schaal": 0.1}, net)
    print(f"h: {len(per_h)} blokken, {totaal_h / 1e6:.1f} MB", file=sys.stderr)


if __name__ == "__main__":
    main()
