"""Voeg de officiële kandidatenlijsten en de twee controlerondes samen tot data/kandidaten.json.

  python3 -I tools/maak_kandidaten.py

Wat op de site komt:
  naam, nummer en woonplaats  altijd, uit de bekendmaking van het centraal stembureau (Gemeenteblad 2026, 499712)
  foto                        alleen als ronde B haar zelf bij deze naam op de bron zag staan; zonder zo'n foto
                              de profielfoto van een bevestigd LinkedIn-profiel ("foto_bestand" in de redactie)
  biografie                   de tekst zoals ronde B haar na controle tegen de bron liet staan
  LinkedIn                    alleen als ronde A en ronde B los van elkaar hetzelfde profiel vonden, met bewijs

Daarbovenop controleert dit script wat een mens over het hoofd ziet: dezelfde foto of hetzelfde profiel bij twee
kandidaten (dan vervallen beide), en een profieladres waarin de naam van de kandidaat niet terug te vinden is.
data/kandidaten-redactie.json bevat de beslissingen van de eindredactie, elk met reden.

Foto's worden opgehaald naar bronnen/_kandidaten/raw/ (niet in de repository) en verkleind naar
src/assets/kandidaten/<lijst>/<nr>.jpg.
"""

import hashlib
import json
import re
import subprocess
import sys
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "bronnen" / "_kandidaten" / "raw"
UIT = ROOT / "src" / "assets" / "kandidaten"
MAAT = 264


def lees(pad, anders=None):
    return json.loads(pad.read_text()) if pad.exists() else anders


def kaal(tekst):
    """Kleine letters zonder accenten en leestekens, om namen te vergelijken."""
    t = unicodedata.normalize("NFKD", tekst or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "", t)


def linkedin_adres(url):
    """Eén schrijfwijze voor een profieladres, of None als het geen persoonlijk profiel is."""
    if not url:
        return None
    m = re.match(r"^https?://(?:[a-z]{2,3}\.)?linkedin\.com/in/([^/?#]+)", url.strip(), re.I)
    return f"https://www.linkedin.com/in/{urllib.parse.unquote(m.group(1)).lower()}/" if m else None


def naam_in_adres(k, adres):
    """Staat de achternaam of de roepnaam van de kandidaat in het profieladres? Bij een dubbele achternaam telt elk deel."""
    stuk = kaal(urllib.parse.unquote(adres.rstrip("/").rsplit("/", 1)[-1]))
    delen = [kaal(d) for d in re.split(r"[-\s]+", k["achternaam"]) if len(kaal(d)) >= 4]
    delen += [kaal(k.get("roepnaam") or "")] if len(kaal(k.get("roepnaam") or "")) >= 4 else []
    return any(d and d in stuk for d in delen)


def haal_foto(url, doel):
    if doel.exists() and doel.stat().st_size > 500:
        return True
    doel.parent.mkdir(parents=True, exist_ok=True)
    try:
        verzoek = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) kandidaten-bouw/0.1"})
        with urllib.request.urlopen(verzoek, timeout=40) as r:
            data = r.read()
    except Exception as fout:  # noqa: BLE001
        print(f"  foto niet opgehaald: {url[:90]} ({fout})", file=sys.stderr)
        return False
    if len(data) < 500 or data[:15].lstrip().lower().startswith((b"<!doctype", b"<html")):
        print(f"  geen afbeelding: {url[:90]}", file=sys.stderr)
        return False
    doel.write_bytes(data)
    return True


def main():
    lijsten = lees(ROOT / "bronnen" / "_verkiezing" / "kandidaten.json")
    redactie = lees(ROOT / "data" / "kandidaten-redactie.json", {})
    ronde = {"A": {}, "B": {}}
    for letter in ronde:
        for pad in sorted((ROOT / "werk" / "kandidaten" / letter).glob("*.json")):
            slug = re.sub(r"-\d+$", "", pad.stem)
            for k in json.loads(pad.read_text()):
                ronde[letter][(slug, k["nr"])] = k

    uit, tel, meldingen = {}, {"kandidaten": 0, "foto": 0, "bio": 0, "linkedin": 0, "A": len(ronde["A"]), "B": len(ronde["B"])}, []
    fotos, profielen = {}, {}
    for lijst in lijsten:
        slug = lijst["slug"]
        rij = []
        for k in lijst["kandidaten"]:
            sleutel = (slug, k["nr"])
            a, b = ronde["A"].get(sleutel, {}), ronde["B"].get(sleutel, {})
            red = redactie.get(f"{slug}/{k['nr']}", {})
            item = {"nr": k["nr"], "naam": k["naam"], "woonplaats": k["woonplaats"], "geslacht": k.get("geslacht") if k.get("geslacht") in ("m", "v") else "x", "foto": None, "bio": None, "bron": None, "linkedin": None}

            if b.get("bio") and b.get("bio_oordeel") in ("akkoord", "aangepast", "nieuw"):
                item["bio"] = " ".join(b["bio"].split())
                item["bron"] = (b.get("bio_bron") or [None])[0] or b.get("pagina")
            if "bio" in red:
                item["bio"] = red["bio"]

            if b.get("foto") and b.get("foto_oordeel") in ("akkoord", "nieuw") and red.get("foto", True) is not None:
                ext = re.sub(r"[^a-z]", "", Path(urllib.parse.urlparse(b["foto"]).path).suffix.lower())[:4] or "img"
                ruw = RAW / slug / f"{k['nr']}.{ext}"
                if haal_foto(b["foto"], ruw):
                    som = hashlib.sha1(ruw.read_bytes()).hexdigest()
                    fotos.setdefault(som, []).append((slug, k["nr"], ruw))
                    item["_ruw"] = ruw
                    item["bron"] = item["bron"] or b.get("foto_bron")

            la, lb = linkedin_adres(a.get("linkedin")), linkedin_adres(b.get("linkedin"))
            oordeel = b.get("linkedin_oordeel")
            if lb and oordeel == "akkoord" and la == lb:
                item["linkedin"] = lb
            elif lb and oordeel == "akkoord" and la != lb:
                meldingen.append(f"{slug}/{k['nr']} {k['naam']}: ronde B zegt akkoord maar de adressen verschillen ({la} / {lb}); niet geplaatst")
            elif lb and oordeel == "nieuw" and "linkedin" not in red:
                meldingen.append(f"{slug}/{k['nr']} {k['naam']}: alleen ronde B vond {lb} (klasse {b.get('linkedin_klasse')}); wacht op de eindredactie")
            if "linkedin" in red:
                item["linkedin"] = linkedin_adres(red["linkedin"]) if red["linkedin"] else None
            if item["linkedin"]:
                if not naam_in_adres(k, item["linkedin"]) and "linkedin" not in red:
                    meldingen.append(f"{slug}/{k['nr']} {k['naam']}: naam niet terug te vinden in {item['linkedin']}; niet geplaatst zonder besluit van de eindredactie")
                    item["linkedin"] = None
                else:
                    profielen.setdefault(item["linkedin"], []).append((slug, k["nr"]))

            # Een profielfoto van LinkedIn, alleen als de partij of de gemeente geen foto gaf en het profiel
            # zelf door de controle is. Het bestand staat in bronnen/_kandidaten/raw/ (niet in de repository).
            if red.get("foto_bestand") and "_ruw" not in item and red.get("foto", True) is not None:
                ruw = (RAW / red["foto_bestand"]).resolve()
                if not item["linkedin"]:
                    meldingen.append(f"{slug}/{k['nr']}: foto_bestand zonder bevestigd LinkedIn-profiel; niet geplaatst")
                elif not ruw.is_relative_to(RAW.resolve()) or not ruw.is_file() or ruw.stat().st_size < 500:
                    meldingen.append(f"{slug}/{k['nr']}: foto_bestand {red['foto_bestand']} niet gevonden in {RAW}; niet geplaatst")
                else:
                    fotos.setdefault(hashlib.sha1(ruw.read_bytes()).hexdigest(), []).append((slug, k["nr"], ruw))
                    item["_ruw"] = ruw
            rij.append(item)
        uit[slug] = rij

    # Dezelfde foto of hetzelfde profiel bij twee kandidaten: een van beide is fout, dus geen van beide.
    dubbel_foto = {(s, n) for groep in fotos.values() if len(groep) > 1 for s, n, _ in groep}
    dubbel_profiel = {sn for groep in profielen.values() if len(groep) > 1 for sn in groep}
    for som, groep in fotos.items():
        if len(groep) > 1:
            meldingen.append("dezelfde foto bij " + ", ".join(f"{s}/{n}" for s, n, _ in groep) + "; bij geen van beiden geplaatst")
    for adres, groep in profielen.items():
        if len(groep) > 1:
            meldingen.append(f"hetzelfde profiel {adres} bij " + ", ".join(f"{s}/{n}" for s, n in groep) + "; bij geen van beiden geplaatst")

    for oud in UIT.glob("*/*.jpg"):
        oud.unlink()
    for slug, rij in uit.items():
        for item in rij:
            ruw = item.pop("_ruw", None)
            if (slug, item["nr"]) in dubbel_profiel:
                item["linkedin"] = None
            if ruw and (slug, item["nr"]) not in dubbel_foto:
                doel = UIT / slug / f"{item['nr']}.jpg"
                doel.parent.mkdir(parents=True, exist_ok=True)
                klaar = subprocess.run(["vips", "thumbnail", str(ruw), f"{doel}[Q=82,strip,optimize_coding]", str(MAAT), "--height", str(MAAT), "--crop", "attention"],
                                       capture_output=True, text=True)
                if klaar.returncode == 0 and doel.exists():
                    item["foto"] = f"{slug}/{item['nr']}.jpg"
                    # En een heel kleine, voor het overzicht van alle lijsten.
                    subprocess.run(["vips", "thumbnail", str(doel), f"{doel.with_name(doel.stem + '-k.jpg')}[Q=78,strip,optimize_coding]", "80", "--height", "80", "--crop", "centre"],
                                   capture_output=True, text=True)
                else:
                    meldingen.append(f"{slug}/{item['nr']}: foto niet om te zetten ({klaar.stderr.strip()[:80]})")
            if not (item["foto"] or item["bio"] or item["linkedin"]):
                item["bron"] = None
            tel["kandidaten"] += 1
            for veld in ("foto", "bio", "linkedin"):
                tel[veld] += bool(item[veld])

    (ROOT / "data" / "kandidaten.json").write_text(json.dumps(uit, ensure_ascii=False, indent=1))
    (ROOT / "werk" / "kandidaten" / "statistiek.json").write_text(json.dumps({"telling": tel, "meldingen": meldingen}, ensure_ascii=False, indent=1))
    print(tel)
    for m in meldingen:
        print(" -", m)


if __name__ == "__main__":
    main()
