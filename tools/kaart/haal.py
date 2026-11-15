# /// script
# requires-python = ">=3.11"
# dependencies = ["shapely", "osmium", "pyproj", "numpy"]
# ///
"""Haal de ruwe gegevens voor de stembureaukaart op: gebouwen uit 3D BAG (per vierkant, via de dienst van 3dbag.nl)
en de ondergrond uit OpenStreetMap (het dagelijkse uittreksel van Noord-Holland bij Geofabrik).

  uv run tools/kaart/haal.py [map met al opgehaalde 3D BAG-vierkanten]

Alles komt in bronnen/_kaart/raw/ (niet in de repository). Een afgebroken run gaat verder waar hij was.
De gemeentegrenzen (bronnen/_kaart/g_*.json) komen van PDOK, Bestuurlijke Gebieden.
"""

import gzip
import json
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from shapely.geometry import box, shape
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[2]
KAART = ROOT / "bronnen" / "_kaart"
RAW = KAART / "raw"
UA = {"User-Agent": "kaart-bouw/0.1"}

# Vierkanten van 500 m op het rijksdriehoeksnet, zo gelegd dat ze samenvallen met een eerdere kaart van Hilversum.
BLOK = 500
XMIN, YMIN, XMAX, YMAX = 129900, 464000, 143900, 478000
NX, NY = (XMAX - XMIN) // BLOK, (YMAX - YMIN) // BLOK


def grens():
    delen = [shape(json.load(open(p))["features"][0]["geometry"]) for p in sorted(KAART.glob("g_*.json"))]
    return unary_union(delen)


def rd_naar_wgs(x, y):
    dx, dy = (x - 155000) * 1e-5, (y - 463000) * 1e-5
    n = (3235.65389 * dy - 32.58297 * dx**2 - 0.2475 * dy**2 - 0.84978 * dx**2 * dy - 0.0655 * dy**3 - 0.01709 * dx**2 * dy**2
         - 0.00738 * dx + 0.0053 * dx**4 - 0.00039 * dx**2 * dy**3 + 0.00033 * dx**4 * dy - 0.00012 * dx * dy)
    e = (5260.52916 * dx + 105.94684 * dx * dy + 2.45656 * dx * dy**2 - 0.81885 * dx**3 + 0.05594 * dx * dy**3 - 0.05607 * dx**3 * dy
         + 0.01199 * dy - 0.00256 * dx**3 * dy**2 + 0.00128 * dx * dy**4 + 0.00022 * dy**2 - 0.00022 * dx**2 + 0.00026 * dx**5)
    return 52.15517440 + n / 3600, 5.38720621 + e / 3600


def haal(url, data=None, pogingen=5, wacht=120):
    for poging in range(pogingen):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, data=data, headers=UA), timeout=wacht) as r:
                return json.loads(r.read())
        except Exception as fout:  # noqa: BLE001
            if poging == pogingen - 1:
                raise
            print(f"opnieuw {poging + 1} {url[:90]}: {fout}", file=sys.stderr)
            time.sleep(3 * (poging + 1))


def gebouwen(hergebruik):
    """3D BAG per vierkant; alleen vierkanten die de gemeente raken."""
    doel = RAW / "3dbag"
    doel.mkdir(parents=True, exist_ok=True)
    gebied = grens().buffer(60)
    werk = []
    for ix in range(NX):
        for iy in range(NY):
            x0, y0 = XMIN + ix * BLOK, YMIN + iy * BLOK
            if gebied.intersects(box(x0, y0, x0 + BLOK, y0 + BLOK)):
                werk.append((x0, y0))

    def vierkant(hoek):
        x0, y0 = hoek
        uit = doel / f"{x0}_{y0}.jsonl.gz"
        if uit.exists():
            return
        oud = hergebruik / f"{x0}_{y0}.jsonl" if hergebruik else None
        if oud and oud.exists():
            uit.with_suffix(".tmp").write_bytes(gzip.compress(oud.read_bytes(), 6))
            uit.with_suffix(".tmp").rename(uit)
            return
        url = f"https://api.3dbag.nl/collections/pand/items?bbox={x0},{y0},{x0 + BLOK},{y0 + BLOK}&limit=100"
        regels = []
        while url:
            pagina = haal(url)
            for f in pagina["features"]:
                f["transform"] = pagina["metadata"]["transform"]
                regels.append(json.dumps(f))
            url = next((l["href"] for l in pagina["links"] if l["rel"] == "next"), None)
        uit.with_suffix(".tmp").write_bytes(gzip.compress(("\n".join(regels) + "\n" if regels else "").encode(), 6))
        uit.with_suffix(".tmp").rename(uit)
        print(f"3dbag {x0}_{y0}: {len(regels)}", file=sys.stderr, flush=True)

    with ThreadPoolExecutor(8) as pool:
        list(pool.map(vierkant, werk))
    print(f"3dbag: {len(werk)} vierkanten", file=sys.stderr)


PBF = "https://download.geofabrik.de/europe/netherlands/noord-holland-latest.osm.pbf"
SLEUTELS = ("highway", "railway", "landuse", "natural", "leisure", "waterway", "place")


def openstreetmap():
    """De ondergrond uit het uittreksel van Noord-Holland dat Geofabrik elke dag van OpenStreetMap maakt: wegen en
    waterlopen als lijnen, grondgebruik als vlakken (ook de samengestelde, zoals een plas met eilanden) en plaatsnamen.
    Alles binnen het gebied, omgerekend naar het rijksdriehoeksnet."""
    import pickle
    import shutil

    import numpy as np
    import osmium
    import shapely
    from pyproj import Transformer

    uit = RAW / "osm.pickle"
    if uit.exists():
        return
    pbf = RAW / "noord-holland.osm.pbf"
    if not pbf.exists():
        with urllib.request.urlopen(urllib.request.Request(PBF, headers=UA), timeout=600) as r, open(pbf.with_suffix(".tmp"), "wb") as f:
            shutil.copyfileobj(r, f)
        pbf.with_suffix(".tmp").rename(pbf)
    naar_rd = Transformer.from_crs("EPSG:4326", "EPSG:28992", always_xy=True)
    (lat0, lon0), (lat1, lon1) = rd_naar_wgs(XMIN - 300, YMIN - 300), rd_naar_wgs(XMAX + 300, YMAX + 300)
    kader = box(XMIN - 300, YMIN - 300, XMAX + 300, YMAX + 300)
    fabriek = osmium.geom.WKBFactory()
    lijnen, vlakken, plaatsen, bomen = [], [], [], []
    bron = osmium.FileProcessor(str(pbf)).with_locations().with_areas().with_filter(osmium.filter.KeyFilter(*SLEUTELS))
    for o in bron:
        if o.is_node():
            if o.tags.get("natural") == "tree" and lon0 <= o.lon <= lon1 and lat0 <= o.lat <= lat1:
                bomen.append(naar_rd.transform(o.lon, o.lat))
            if "place" in o.tags or o.tags.get("railway") == "station":
                if lon0 <= o.lon <= lon1 and lat0 <= o.lat <= lat1 and "name" in o.tags:
                    x, y = naar_rd.transform(o.lon, o.lat)
                    plaatsen.append((o.tags["name"], o.tags.get("place") or "station", x, y))
        elif o.is_way():
            if not any(k in o.tags for k in ("highway", "railway", "waterway")) and o.tags.get("natural") != "tree_row":
                continue
            punten = [(n.lon, n.lat) for n in o.nodes if n.location.valid()]
            if len(punten) < 2 or not any(lon0 <= lon <= lon1 and lat0 <= lat <= lat1 for lon, lat in punten):
                continue
            lon, lat = zip(*punten)
            x, y = naar_rd.transform(np.array(lon), np.array(lat))
            lijnen.append(({t.k: t.v for t in o.tags}, np.column_stack([x, y])))
        elif o.is_area():
            if not any(k in o.tags for k in ("landuse", "natural", "leisure")):
                continue
            eerste = next((n for ring in o.outer_rings() for n in ring), None)
            if eerste is None or not (lon0 - 0.25 <= eerste.lon <= lon1 + 0.25 and lat0 - 0.15 <= eerste.lat <= lat1 + 0.15):
                continue
            try:
                vlak = shapely.from_wkb(bytes.fromhex(fabriek.create_multipolygon(o)))
            except Exception:  # noqa: BLE001
                continue
            vlak = shapely.transform(vlak, lambda c: np.column_stack(naar_rd.transform(c[:, 0], c[:, 1])))
            if not vlak.is_valid:
                vlak = vlak.buffer(0)
            if vlak.is_empty or not vlak.intersects(kader):
                continue
            vlakken.append(({t.k: t.v for t in o.tags}, shapely.to_wkb(vlak)))
    uit.with_suffix(".tmp").write_bytes(pickle.dumps({"lijnen": lijnen, "vlakken": vlakken, "plaatsen": plaatsen, "bomen": bomen}))
    uit.with_suffix(".tmp").rename(uit)
    print(f"osm: {len(lijnen)} lijnen, {len(vlakken)} vlakken, {len(plaatsen)} plaatsnamen, {len(bomen)} losse bomen", file=sys.stderr)


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    hergebruik = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    with ThreadPoolExecutor(2) as pool:
        bag, osm = pool.submit(gebouwen, hergebruik), pool.submit(openstreetmap)
        bag.result()
        osm.result()
    print("klaar", file=sys.stderr)


if __name__ == "__main__":
    main()
