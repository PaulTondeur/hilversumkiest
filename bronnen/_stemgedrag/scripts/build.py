"""Build stemmingen.json from all.json + curated meta.
Usage: python3 -I build.py all.json out.json
"""
import sys, json, re, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from meta import M, EXTRA

a = json.load(open(sys.argv[1]))
SEATS = {'Hilversum': 37, 'Wijdemeren': 19}
out = []
for idx, (thema, typ, onderwerp, ind, opm) in M.items():
    x = a[idx]
    pos = x['pos']
    voor = sorted(k for k, v in pos.items() if v['voor'] and not v['tegen'])
    tegen = sorted(k for k, v in pos.items() if v['tegen'] and not v['voor'])
    verd = sorted(f"{k} ({v['voor']} voor, {v['tegen']} tegen)" for k, v in pos.items() if v['voor'] and v['tegen'])
    nv, nt = x['n_voor'], x['n_tegen']
    if nv > nt:
        uit = f'aangenomen {nv}-{nt}'
    elif nv < nt:
        uit = f'verworpen {nv}-{nt}'
    else:
        uit = f'stemmen staken {nv}-{nt}'
    notes = []
    if x['raad'] == 'Hilversum' and 'Fractie Van de Linde' in pos and x['datum'] < '2026-03-01':
        notes.append("Fractie Van de Linde staat in iBabs tot maart 2026 als aparte fractie 'VVD' (1 lid); de overige VVD-leden als 'VVD.'/'VVD_'. Hier op naam van het lid toegewezen.")
    if opm:
        notes.append(opm)
    titel = re.sub(r'\s*\((Het (raads)?voorstel|M-V-\d is).*$', '', x['titel']).strip()
    out.append({
        'id': f"{x['raad'][0]}-{x['datum']}-{idx}",
        'raad': x['raad'], 'datum': x['datum'], 'titel': titel, 'type': typ,
        'onderwerp': onderwerp, 'thema': thema, 'indieners': ind or 'niet vastgesteld',
        'voor': voor, 'tegen': tegen, 'verdeeld': verd,
        'afwezig_aantal': SEATS[x['raad']] - nv - nt,
        'uitslag': uit, 'bron_url': x['url'], 'geverifieerd': True,
        'opmerking': ' '.join(notes),
    })
out += EXTRA
out.sort(key=lambda r: (r['thema'], r['raad'], r['datum']))
json.dump(out, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
print(len(out))
