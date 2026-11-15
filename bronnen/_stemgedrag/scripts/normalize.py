"""Normalize fraction labels and compute per-fraction positions.
Usage: python3 -I normalize.py hv_votes.json wd_votes.json out.json compact.txt
"""
import sys, json, re

HV = {
    'Hart voor Hilversum': 'Hart voor Hilversum', 'D66': 'D66', 'VVD': 'VVD', 'VVD.': 'VVD', 'VVD_': 'VVD',
    'GroenLinks': 'GroenLinks', 'CDA': 'CDA', 'Democraten Hilversum': 'Democraten Hilversum', 'PvdA': 'PvdA',
    'SP': 'SP', 'ChristenUnie': 'ChristenUnie', 'BVNL': 'BVNL', 'Fractie Durlacher': 'Fractie Durlacher',
    'Libertaire Fractie Durlacher': 'Libertaire Fractie Durlacher', 'Fractie Lahaise': 'Fractie Lahaise',
    'OpStand': 'OpStand', 'Fractie Zaabat': 'Fractie Zaabat', 'Fractie Van de Linde': 'Fractie Van de Linde',
    'Sociaal-Conservatieve Beweging': 'SCB', 'Gewoon, Hilversum': 'Gewoon, Hilversum',
}
WD = {'Dorpsbelangen': 'DorpsBelangen'}
AB = {'Hart voor Hilversum': 'HvH', 'GroenLinks': 'GL', 'Democraten Hilversum': 'DH', 'ChristenUnie': 'CU',
      'Fractie Durlacher': 'FD', 'Libertaire Fractie Durlacher': 'LFD', 'Fractie Lahaise': 'Lahaise',
      'Fractie Zaabat': 'Zaabat', 'Fractie Van de Linde': 'VdLinde', 'Gewoon, Hilversum': 'Gewoon',
      'De Lokale Partij': 'DLP', 'DorpsBelangen': 'DB', 'PvdA-GroenLinks': 'PvdA-GL', 'Groep Goetheer': 'Goetheer'}

def norm_hv(f, date):
    lab = re.sub(r'^\d+\. ', '', f['fractie']).strip()
    name = HV.get(lab, lab)
    # Van de Linde voted under a separate plain 'VVD' label while the rest of VVD used 'VVD.'/'VVD_'
    if lab == 'VVD' and '2025-09-01' <= date < '2026-03-01' and f['n'] == 1 and 'Linde' in f['leden']:
        name = 'Fractie Van de Linde'
    return name

def positions(x, raad):
    pos = {}
    for side in ('voor', 'tegen'):
        for f in x[side]:
            n = norm_hv(f, x['datum']) if raad == 'Hilversum' else WD.get(f['fractie'], f['fractie'])
            pos.setdefault(n, {'voor': 0, 'tegen': 0})[side] += f['n']
    return pos

out = []
for path, raad in ((sys.argv[1], 'Hilversum'), (sys.argv[2], 'Wijdemeren')):
    for x in json.load(open(path)):
        p = positions(x, raad)
        voor = sorted(k for k, v in p.items() if v['voor'] and not v['tegen'])
        tegen = sorted(k for k, v in p.items() if v['tegen'] and not v['voor'])
        verd = sorted(f"{k} ({v['voor']}-{v['tegen']})" for k, v in p.items() if v['voor'] and v['tegen'])
        out.append({'raad': raad, 'datum': x['datum'], 'titel': x['titel'], 'url': x['url'],
                    'n_voor': x['n_voor'], 'n_tegen': x['n_tegen'], 'voor': voor, 'tegen': tegen,
                    'verdeeld': verd, 'pos': p, 'resultaat': x.get('resultaat', ''),
                    'panel_id': x.get('panel_id', ''), 'meeting_id': x['meeting_id']})
json.dump(out, open(sys.argv[3], 'w'), ensure_ascii=False, indent=1)
ab = lambda l: ','.join(AB.get(re.sub(r' \(.*', '', s), s) + (re.search(r' \(.*', s).group(0) if '(' in s else '') for s in l)
with open(sys.argv[4], 'w') as fh:
    for i, x in enumerate(out):
        if x['n_tegen'] == 0 or x['n_voor'] == 0:
            continue
        uitslag = 'A' if x['n_voor'] > x['n_tegen'] else 'V'
        fh.write(f"{i}|{x['raad'][0]}|{x['datum']}|{x['titel'][:110]}|{x['n_voor']}-{x['n_tegen']}{uitslag}|V:{ab(x['voor'])}|T:{ab(x['tegen'])}|{ab(x['verdeeld'])}\n")
print(len(out))
